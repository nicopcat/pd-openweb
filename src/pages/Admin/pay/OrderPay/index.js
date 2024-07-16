import React, { Component, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import preall from 'src/common/preall';
import DocumentTitle from 'react-document-title';
import { LoadDiv, Button, Dialog, Qr } from 'ming-ui';
import paymentAjax from 'src/api/payment';
import { browserIsMobile, getRequest } from 'src/util';
import cx from 'classnames';
import './index.less';
import _ from 'lodash';
import { getOrderStatusInfo } from '../Merchant/config';
import { formatDate } from '../util';
import PayErrorIcon from '../components/PayErrorIcon';

const formatWeChatPayInfo = payInfo => {
  if (!payInfo) return {};
  const arr = payInfo.split(',');
  let result = {};
  arr.forEach(item => {
    const keyValue = item.split(':');
    result[JSON.parse(keyValue[0])] = JSON.parse(keyValue[1]);
  });
  return result;
};

export default class OrderPay extends Component {
  constructor(props) {
    super(props);

    this.state = {
      orderInfo: {},
      loading: true,
    };
    this.promise = null;
    this.timer = null;
  }

  componentDidMount() {
    // 手机后台切换页面返回当前页时重新获取数据确保支付信息显示准确
    if (browserIsMobile()) {
      window.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.state.orderStatus === 0) {
          clearTimeout(this.timer);
          this.getData();
        }
      });
    }

    this.getData();
  }

  getData = async orderId => {
    const urlMatch = location.pathname.match(/.*\/(\w[\w]*\w)/);
    orderId = orderId ? orderId : this.props.orderId ? this.props.orderId : urlMatch[1];

    if (urlMatch && urlMatch[1].length !== 32 && !this.props.orderId) {
      this.setState({ orderStatus: -1, errorMessage: _l('订单不存在'), loading: false });
      return;
    }

    const { code } = getRequest() || {};
    const orderInfo = await paymentAjax.getPayOrder({ orderId: orderId });
    const { status, wechatPayStatus, expireCountdown, msg, amount, expireTime } = orderInfo || {};

    if (status !== 0 || !!msg) {
      this.setState({
        orderInfo,
        orderStatus: !!msg ? -1 : status,
        loading: false,
      });
      $('.qrCodeWrap').parent().parent().remove();
      return;
    }

    if (amount <= 0) {
      clearTimeout(this.timer);
      expireTime !== 0 && this.handleCountDown(expireCountdown);
    } else {
      this.pollOrderStatus(orderInfo);

      if (window.isWeiXin && wechatPayStatus === 2 && code && browserIsMobile()) {
        // 微信环境下&开通微信支付&已授权
        this.getWeChatPayInfo(wechatPayStatus);
      }
    }

    this.setState({ orderInfo: orderInfo, orderStatus: status, loading: false, expireCountdown });
  };

  // 支付宝支付
  handleAliPay = () => {
    const urlMatch = location.pathname.match(/.*\/(\w[\w]*\w)/);
    const orderId = this.props.orderId ? this.props.orderId : urlMatch[1];
    if (this.state.payLoading) return;
    this.setState({ payLoading: true });

    paymentAjax
      .aliPay({ orderId })
      .then(res => {
        this.setState({ payLoading: false });

        window.open(res.codeUrl, '_self');
        return;
      })
      .catch(err => {
        this.setState({ payLoading: false });
      });
  };

  // 微信授权并支付
  getWeChatPayInfo = async wechatPayStatus => {
    const urlMatch = location.pathname.match(/.*\/(\w[\w]*\w)/);
    const orderId = this.props.orderId ? this.props.orderId : urlMatch[1];
    const { code } = getRequest() || {};

    if (wechatPayStatus !== 2) {
      alert(_l('商户暂未开通微信支付'), 2);
      return;
    }

    const cacheUserInfo = localStorage.getItem('wxUserInfo');
    const wxUserInfo = JSON.parse(cacheUserInfo || '{}');
    const openId = wxUserInfo.openId || localStorage.getItem('wechatPayOpenId');

    if (!window.isWeiXin) return;

    if (!code && !openId) {
      const wxAuthUrl = await paymentAjax.getWxAuthUrl({ orderId });

      location.href = wxAuthUrl.replace('&redirect_uri=custom', `&redirect_uri=${encodeURIComponent(location.href)}`);
      return;
    }

    this.setState({ payLoading: true });

    paymentAjax
      .wechatPay({ code, orderId, openId })
      .then(weChatPayInfo => {
        localStorage.setItem('wechatPayOpenId', weChatPayInfo.openId);
        WeixinJSBridge.invoke('getBrandWCPayRequest', formatWeChatPayInfo(weChatPayInfo.payInfo), res => {
          this.setState({ payLoading: false });
          if (res.err_msg == 'get_brand_wcpay_request:ok') {
            // 使用以上方式判断前端返回,微信团队郑重提示：
            //res.err_msg将在用户支付成功后返回ok，但并不保证它绝对可靠。
            this.setState({ payLoading: false });
          }
          if (res.err_msg == 'get_brand_wcpay_request:cancel' || res.err_msg == 'get_brand_wcpay_request:fail') {
            // 取消支付||支付失败
            window.history.replaceState({}, '', `${location.origin}/orderpay/${orderId}`);
            this.setState({ payLoading: false });
          }
        });
      })
      .catch(({ errorCode, errorMessage }) => {
        window.history.replaceState({}, '', `${location.origin}/orderpay/${orderId}`);
        this.setState({ payLoading: false });
      });
  };

  // 无需支付时时效倒计时
  handleCountDown = expireCountdown => {
    if (expireCountdown > 0) {
      this.setState({ expireCountdown }, () => {
        this.timer = setTimeout(() => this.handleCountDown(expireCountdown - 1), 1000);
      });
    } else {
      this.setState({ orderStatus: 4 });
    }
  };

  // 轮询订单状态
  pollOrderStatus = (orderInfo = {}) => {
    const { orderId } = orderInfo;

    paymentAjax.getPayOrderStatus({ orderId }).then(({ status, expireCountdown, msg, amount, description }) => {
      if (_.includes([1, 4], status)) {
        this.getData();
        $('.qrCodeWrap').parent().parent().remove();
      } else {
        this.setState(
          {
            orderStatus: orderInfo.expireTime !== 0 && expireCountdown < 0 ? 4 : status,
            expireCountdown,
            orderInfo: !!msg ? { ...orderInfo, status, msg, description } : { ...orderInfo, amount, description },
          },
          () => {
            if (amount === 0 && !msg) {
              this.handleCountDown(expireCountdown);
            }
            if (!!msg || amount === 0) return;

            this.timer = setTimeout(() => {
              this.pollOrderStatus(orderInfo);
            }, 1000);
          },
        );
      }
    });
  };

  // 检查订单<=0的订单
  checkPayOrder = () => {
    const { orderInfo = {} } = this.state;
    const { orderId } = orderInfo;

    paymentAjax.checkPayOrder({ orderId }).then(() => this.getData(orderId));
  };

  // 成功、超时等状态
  renderPayStatus = () => {
    const { orderInfo, errorMessage } = this.state;
    const { description, amount, payOrderType, paidTime, createTime, shortName, merchantOrderId, orderId, msg } =
      orderInfo;
    const orderStatus = errorMessage || msg ? -1 : this.state.orderStatus;
    const { text, icon, color } = getOrderStatusInfo(msg || errorMessage ? -1 : orderStatus, msg || errorMessage);
    const isMobile = browserIsMobile();

    return (
      <div className={`payStatusWrap ${isMobile ? 'mobileWrap' : 'flexColumn alignItemsCenter justifyContentCenter'}`}>
        <div className="content Font15">
          <div className="flexColumn alignItemsCenter mBottom40">
            {orderStatus === 4 ? (
              <i className={`overTimeIcon icon ${icon}`} />
            ) : (
              <div
                className="okIcon"
                style={_.includes([1, 2, 3, 5], orderStatus) ? { background: color } : { color, fontSize: '44px' }}
              >
                <i className={`icon ${icon}`} />
              </div>
            )}
            <div className="Font28 bold">{text}</div>
          </div>
          {orderId && (
            <Fragment>
              <div className="orderInfoItem">
                <span>{_l('支付金额：')}</span>
                <span>{_l('%0元', amount <= 0 ? 0 : (amount || 0).toLocaleString())}</span>
              </div>
              <div className="orderInfoItem">
                <span>{_l('支付内容：')}</span>
                <span className="flex ellipsis">{description || '-'}</span>
              </div>
              <div className="orderInfoItem">
                <span>{_l('收款账户：')}</span>
                <span>{shortName}</span>
              </div>
              {_.includes([1, 2, 3, 5], orderStatus) && amount > 0 && (
                <div className="orderInfoItem">
                  <span>{_l('支付方式：')}</span>
                  <span>{payOrderType === 0 ? _l('支付宝') : _l('微信')}</span>
                </div>
              )}
              <div className="orderInfoItem">
                <span>{_l('订单编号：')}</span>
                <span className="flex value">{orderId || '-'}</span>
              </div>
              <div className="orderInfoItem">
                <span>{_l('下单时间：')}</span>
                <span>{formatDate(createTime)}</span>
              </div>
              {_.includes([1, 2, 3, 5], orderStatus) && (
                <Fragment>
                  {merchantOrderId && (
                    <div className="orderInfoItem">
                      <span>{_l('交易单号：')}</span>
                      <span className="flex value">{merchantOrderId}</span>
                    </div>
                  )}
                  <div className="orderInfoItem">
                    <span>{_l('支付时间：')}</span>
                    <span>{formatDate(paidTime)}</span>
                  </div>
                </Fragment>
              )}
            </Fragment>
          )}
        </div>
      </div>
    );
  };

  renderError = () => {
    const { orderInfo = {}, errorMessage } = this.state;
    const { description, orderId, createTime, shortName, status, msg } = orderInfo;

    return (
      <Fragment>
        <PayErrorIcon className="mobilePayErrorIcon" />
        <div className="Red mTop24 mBottom50 bold Font17 TxtCenter">
          {_.includes([50, 70, 73, 74], status) ? _l('未查询到支付内容或付款金额！') : msg || errorMessage}
        </div>
        {description && (
          <div className="flexRow mBottom20 Font15">
            <span>{_l('支付内容：')}</span>
            <div className="flex ellipsis">{description}</div>
          </div>
        )}
        <div className="mBottom20 ellipsis Font15">
          <span>{_l('订单编号：')}</span>
          <span className="value">{orderId}</span>
        </div>
        <div className="mBottom20 Font15">
          <span>{_l('收款方：')}</span>
          <span>{shortName}</span>
        </div>
        <div className="mBottom20 Font15">
          <span>{_l('下单时间：')}</span>
          <span>{formatDate(createTime)}</span>
        </div>
      </Fragment>
    );
  };

  renderOrderQrCode = (orderId, type) => {
    const isMobile = browserIsMobile();

    Dialog.confirm({
      overlayClosable: true,
      closable: !isMobile,
      className: `qrCodeWrap ${!isMobile ? 'pcQrCodeWrap' : ''}`,
      noFooter: true,
      children: (
        <Fragment>
          <div className="qrCode">
            <Qr content={`${md.global.Config.WebUrl}orderpay/${orderId}`} width={250} height={250} />
          </div>
          <div className="bold mTop10 TxtCenter Font15">
            {type == 1 ? _l('请使用微信扫码支付') : _l('请使用支付宝扫码支付')}
          </div>
        </Fragment>
      ),
    });
  };

  render() {
    const { loading, orderInfo = {}, orderStatus, payLoading, expireCountdown, errorMessage } = this.state;
    const { description, amount, orderId, createTime, aliPayStatus, wechatPayStatus, shortName, expireTime, msg } =
      orderInfo;
    const isMobile = browserIsMobile();
    const isAli = navigator.userAgent.toLowerCase().indexOf('alipay') !== -1; // 支付宝环境
    const { text } = getOrderStatusInfo(orderStatus, msg || errorMessage);
    const statusTxt = _.isUndefined(orderStatus) ? '' : text;
    const m = Math.floor((expireCountdown / 60) % 60);
    const s = Math.floor(expireCountdown % 60);
    const currentUrl = encodeURIComponent(`${md.global.Config.WebUrl}orderpay/${orderId}`);

    return (
      <div className={cx('orderPayWrap', { mobileWrap: isMobile })}>
        <DocumentTitle title={loading ? _l('加载中...') : `${statusTxt}${description ? `:` + description : ''}`} />
        {loading ? (
          <LoadDiv />
        ) : _.includes([1, 2, 3, 4, 5], orderStatus) ? (
          this.renderPayStatus()
        ) : orderStatus ? (
          this.renderError()
        ) : (
          <Fragment>
            <div className="orderInfo">
              {expireTime ? (
                <div className="Font15 TxtCenter mBottom6">
                  <span className="Font17">{_l('支付剩余时间：')}</span>
                  <span className="Font17 bold">
                    {m > 0 && s > 0 ? _l('%0分%1秒', m, s) : m > 0 ? _l('%0分', m) : _l('%0秒', s)}
                  </span>
                </div>
              ) : (
                ''
              )}
              <div className="ThemeColor mBottom24 TxtCenter">
                <span className={cx('amount', isMobile ? 'Font50' : 'Font40')}>
                  ¥ {amount <= 0 ? 0 : (amount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flexRow mBottom20 Font15">
                <span>{_l('支付内容：')}</span>
                <div className="flex ellipsis">{description}</div>
              </div>
              <div className="mBottom20 ellipsis Font15">
                <span>{_l('订单编号：')}</span>
                <span className="value">{orderId}</span>
              </div>
              <div className="mBottom20 Font15">
                <span>{_l('收款方：')}</span>
                <span>{shortName}</span>
              </div>
              <div className="mBottom20 Font15">
                <span>{_l('下单时间：')}</span>
                <span>{formatDate(createTime)}</span>
              </div>
            </div>
            <div className="flex"></div>
            {window.isWeiXin || isAli || amount <= 0 ? (
              <Button
                radius
                className="w100 pLeft24 pRight24 payBtn"
                onClick={() => {
                  if (payLoading) return;

                  if (window.isWeiXin && wechatPayStatus !== 2) {
                    alert(_l('商户暂不支持微信支付'), 2);
                    return;
                  }

                  if (isAli && aliPayStatus !== 2) {
                    alert(_l('商户暂不支持支付宝支付'), 2);
                    return;
                  }

                  // 微信浏览器内
                  if (window.isWeiXin && !isMobile && amount > 0) {
                    alert(_l('请在微信app内下单支付'), 2);
                    return;
                  }

                  if (amount <= 0) {
                    this.checkPayOrder();
                  } else if (window.isWeiXin && wechatPayStatus === 2) {
                    this.getWeChatPayInfo(wechatPayStatus);
                  } else if (isAli && aliPayStatus === 2) {
                    this.handleAliPay();
                  }
                }}
              >
                {amount <= 0 ? _l('确认') : payLoading ? _l('正在发起支付，请稍候…') : _l('立即支付')}
              </Button>
            ) : (
              <div className="flexRow pTop20">
                {wechatPayStatus === 2 && (
                  <Button
                    radius
                    className="mRight10 weChatPay pLeft24 pRight24 flex"
                    onClick={() => this.renderOrderQrCode(orderId, 1)}
                  >
                    <i className="icon-wechat_pay mRight10  Font28 TxtMiddle" />
                    <span className="flex">{_l('微信支付')}</span>
                  </Button>
                )}
                {aliPayStatus === 2 && (
                  <a
                    className="aliPay pLeft24 pRight24 flex"
                    href={!isMobile ? '#' : `alipays://platformapi/startapp?appId=10000007&qrcode=${currentUrl}`}
                    onClick={() => {
                      if (!isMobile) {
                        this.renderOrderQrCode(orderId, 2);
                      }
                    }}
                  >
                    <i className="icon-order-alipay mRight10  Font28 TxtMiddle" />
                    <span className="flex bold Font14">{_l('支付宝')}</span>
                  </a>
                )}
              </div>
            )}
          </Fragment>
        )}
      </div>
    );
  }
}

const Comp = preall(OrderPay, { allowNotLogin: true });
const root = createRoot(document.querySelector('#orderPay'));

root.render(<Comp />);
