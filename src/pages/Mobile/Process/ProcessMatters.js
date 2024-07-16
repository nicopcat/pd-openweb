import React, { Fragment, Component } from 'react';
import cx from 'classnames';
import qs from 'query-string';
import { Tabs, Flex, Checkbox, Modal } from 'antd-mobile';
import { Icon, LoadDiv, ScrollView, Signature, VerifyPasswordInput } from 'ming-ui';
import Back from '../components/Back';
import styled from 'styled-components';
import ProcessRecordInfo from 'mobile/ProcessRecord';
import instanceVersion from 'src/pages/workflow/api/instanceVersion';
import { getTodoCount } from 'src/pages/workflow/MyProcess/Entry';
import Card from './Card';
import ProcessDelegation from './ProcessDelegation';
import { getRequest } from 'src/util';
import { verifyPassword } from 'src/util';
import './index.less';
import 'src/pages/worksheet/common/newRecord/NewRecord.less';
import 'mobile/ProcessRecord/OtherAction/index.less';
import _ from 'lodash';

const ModalWrap = styled(Modal)`
  height: 95%;
  overflow: hidden;
  border-top-right-radius: 15px;
  border-top-left-radius: 15px;
  .content {
    background-color: #f3f3f3;
  }
  .closeBtn, .rejectApprove {
    color: #999;
    text-align: center;
    padding: 4px 15px;
    border-radius: 24px;
    border: 1px solid #DDDDDD;
    background-color: #fff;
  }
  .rejectApprove {
    &.select {
      color: #F44336;
      border-color: #F44336;
      background-color: rgba(244, 67, 54, 0.12);
    }
    &.all {
      color: #fff;
      border-color: #F44336;
      background-color: #F44336;
    }
  }
`;

const tabs = [
  {
    name: _l('待办'),
    id: 'untreated',
    icon: 'access_time',
    className: 'Font18',
    tabs: [
      {
        name: _l('待审批'),
        id: 'waitingApproval',
        param: {
          type: 4,
        },
      },
      {
        name: _l('待填写'),
        id: 'waitingWrite',
        param: {
          type: 3,
        },
      },
    ],
  },
  {
    name: _l('我发起的'),
    id: 'mySponsor',
    icon: 'send',
    className: 'Font18',
    tabs: [],
    param: {
      type: 0,
    },
  },
  {
    name: _l('已完成'),
    id: 'processed',
    icon: 'succeed-one-o',
    className: 'Font15',
    tabs: [
      {
        name: _l('已处理'),
        id: 'completeDispose',
        param: {
          type: -1,
          complete: true,
        },
      },
      {
        name: _l('我发起的'),
        id: 'completeMySponsor',
        param: {
          type: 0,
          complete: true,
        },
      },
    ],
  },
];

export default class ProcessMatters extends Component {
  constructor(props) {
    super(props);
    const { search } = props.location;
    const data = qs.parse(search);
    const bottomTab = _.find(tabs, { id: data.tab });
    this.state = {
      pageIndex: 1,
      pageSize: 30,
      list: [],
      loading: false,
      isMore: true,
      bottomTab: bottomTab ? bottomTab : tabs[0],
      topTab: data.tab ? _.find(tabs[0].tabs, { id: data.tab }) : tabs[0].tabs[0],
      searchValue: '',
      countData: {},
      appCount: {},
      previewRecord: {},
      batchApproval: false,
      approveCards: [],
      approveType: null,
      encryptType: null
    };
  }
  componentDidMount() {
    this.getTodoList();
    this.getTodoCount();
    verifyPassword({
      checkNeedAuth: true,
      fail: () => {
        this.setState({ showPassword: true });
      },
    });
  }
  getTodoList() {
    const param = {};
    const { loading, isMore, topTab, bottomTab, searchValue } = this.state;
    const { appId } = getRequest();

    if (loading || !isMore) {
      return;
    }

    this.setState({
      loading: true,
    });

    if (this.request) {
      this.request.abort();
    }
    if (searchValue) {
      param.keyword = searchValue;
    }
    if (appId) {
      param.apkId = appId;
    }

    const { pageIndex, pageSize, list, stateTab } = this.state;
    this.request = instanceVersion.getTodoList({
      pageSize,
      pageIndex,
      ...param,
      ...(topTab ? topTab.param : bottomTab.param),
    });

    this.request.then(result => {
      this.setState({
        list: list.concat(result),
        loading: false,
        pageIndex: pageIndex + 1,
        isMore: result.length === pageSize,
      });
    });
  }
  getTodoCount() {
    const { appId } = getRequest();
    if (appId) {
      Promise.all([
        instanceVersion.getTodoListFilter({ type: 4 }).then(),
        instanceVersion.getTodoListFilter({ type: 3 }).then(),
      ]).then(result => {
        const [approveList, writeList] = result;
        const approve = _.find(approveList, { app: { id: appId } });
        const write = _.find(writeList, { app: { id: appId } });
        this.setState({
          appCount: {
            approveCount: approve ? approve.count : 0,
            writeCount: write ? write.count : 0,
          },
        });
      });
    } else {
      getTodoCount().then(countData => {
        this.setState({
          countData,
        });
      });
    }
  }
  handleChangeCompleteTab = tab => {
    this.setState(
      {
        loading: false,
        pageIndex: 1,
        isMore: true,
        list: [],
        bottomTab: tab,
        topTab: tab.tabs[0],
      },
      () => {
        this.getTodoList();
      },
    );
  };
  handleChangeTopTab = tab => {
    this.setState(
      {
        loading: false,
        pageIndex: 1,
        isMore: true,
        list: [],
        topTab: tab,
      },
      () => {
        this.getTodoList();
      },
    );
  };
  handleScrollEnd = tab => {
    this.getTodoList();
  };
  handleApproveDone = ({ id, workId }) => {
    const { list, countData, appCount, topTab = {} } = this.state;
    const { appId } = getRequest();
    if (appId) {
      const countDataState = {
        ...appCount,
      };
      if (topTab.id === 'waitingApproval') {
        countDataState.approveCount = appCount.approveCount - 1;
      }
      if (topTab.id === 'waitingWrite') {
        countDataState.writeCount = appCount.writeCount - 1;
      }
      this.setState({
        list: list.filter(item => item.workId !== workId),
        appCount: countDataState,
      });
    } else {
      const countDataState = {
        ...countData,
      };
      if (topTab.id === 'waitingApproval') {
        countDataState.waitingApproval = countData.waitingApproval - 1;
      }
      if (topTab.id === 'waitingWrite') {
        countDataState.waitingWrite = countData.waitingWrite - 1;
      }
      this.setState({
        list: list.filter(item => item.workId !== workId),
        countData: countDataState,
      });
    }
  };
  hanndleApprove = (type, batchType) => {
    const { approveCards } = this.state;
    const rejectCards = approveCards.filter(c => _.get(c, 'flowNode.btnMap')[5]);
    const cards = type === 5 ? rejectCards : approveCards;
    const signatureCard = cards.filter(card => (_.get(card.flowNode, batchType) || []).includes(1));
    const encryptCard = cards.filter(card => _.get(card.flowNode, 'encrypt'));
    if (_.isEmpty(cards)) {
      alert(_l('请先勾选需要处理的审批'), 2);
      return;
    }
    if (signatureCard.length || encryptCard.length) {
      if (signatureCard.length) {
        this.setState({ approveType: type });
      }
      if (encryptCard.length) {
        this.setState({ encryptType: type });
      }
    } else {
      this.handleBatchApprove(null, type);
    }
  };
  handleBatchApprove = (signature, approveType) => {
    const batchType = approveType === 4 ? 'auth.passTypeList' : 'auth.overruleTypeList';
    const { approveCards } = this.state;
    const rejectCards = approveCards.filter(c => _.get(c, 'flowNode.btnMap')[5]);
    const cards = approveType === 5 ? rejectCards : approveCards;
    const selects = cards.map(({ id, workId, flowNode }) => {
      const data = { id, workId, opinion: _l('批量处理') };
      if ((_.get(flowNode, batchType) || []).includes(1)) {
        return {
          ...data,
          signature,
        };
      } else {
        return data;
      }
    });
    instanceVersion
      .batch({
        type: 4,
        batchOperationType: approveType,
        selects,
      })
      .then(result => {
        if (result) {
          alert(_l('操作成功'), 1);
          this.setState({ batchApproval: false, approveCards: [] });
          this.getTodoList();
          this.getTodoCount();
        }
      });
  };
  renderSignatureDialog() {
    const { approveType, encryptType } = this.state;
    const type = approveType || encryptType;
    const batchType = type === 4 ? 'auth.passTypeList' : 'auth.overruleTypeList';
    const approveCards = type === 4 ? this.state.approveCards : this.state.approveCards.filter(c => _.get(c, 'flowNode.btnMap')[5]);
    const signatureApproveCards = approveCards.filter(card => (_.get(card.flowNode, batchType) || []).includes(1));
    const encryptCard = approveCards.filter(card => _.get(card.flowNode, 'encrypt'));
    return (
      <Modal
        popup
        visible={true}
        onClose={() => {
          this.setState({ approveType: null, encryptType: null });
        }}
        animationType="slide-up"
      >
        <div className="otherActionWrapper flexColumn">
          <div className="flex pAll10">
            <div className="Gray_75 Font14 TxtLeft mBottom10">
              {_l('其中')}
              {!!signatureApproveCards.length && _l('%0个事项需要签名', signatureApproveCards.length)}
              {!!(signatureApproveCards.length && encryptCard.length) && '，'}
              {!!encryptCard.length && _l('%0个事项需要验证登录密码', encryptCard.length)}
            </div>
            {!!signatureApproveCards.length && (
              <Signature
                ref={signature => {
                  this.signature = signature;
                }}
              />
            )}
            {encryptType && (
              <div className="mTop20 TxtLeft">
                <VerifyPasswordInput
                  showSubTitle={false}
                  isRequired={true}
                  allowNoVerify={false}
                  onChange={({ password }) => {
                    if (password !== undefined) this.password = password;
                  }}
                />
              </div>
            )}
          </div>
          <div className="flexRow actionBtnWrapper">
            <div
              className="flex actionBtn"
              onClick={() => {
                this.setState({ approveType: null, encryptType: null });
              }}
            >
              {_l('取消')}
            </div>
            <div
              className="flex actionBtn ok"
              onClick={() => {
                if (signatureApproveCards.length && this.signature.checkContentIsEmpty()) {
                  alert(_l('请填写签名'), 2);
                  return;
                }
                const submitFun = () => {
                  if (signatureApproveCards.length) {
                    this.signature.saveSignature(signature => {
                      this.handleBatchApprove(signature, this.state.approveType);
                      this.setState({ approveType: null, encryptType: null });
                    });
                  } else {
                    this.handleBatchApprove(null, this.state.encryptType);
                    this.setState({ approveType: null, encryptType: null });
                  }
                };
                if (encryptCard.length) {
                  if (!this.password || !this.password.trim()) {
                    alert(_l('请输入密码'), 3);
                    return;
                  }
                  verifyPassword({
                    password: this.password,
                    closeImageValidation: true,
                    success: submitFun,
                  });
                } else {
                  submitFun();
                }
              }}
            >
              {_l('确定')}
            </div>
          </div>
        </div>
      </Modal>
    );
  }
  renderRejectDialog() {
    const { approveCards, batchApproval, filter, topTab } = this.state;
    const rejectCards = approveCards.filter(c => _.get(c, 'flowNode.btnMap')[5]);
    const noRejectCards = approveCards.filter(c => !_.get(c, 'flowNode.btnMap')[5]);
    return (
      <ModalWrap
        popup
        visible={true}
        onClose={() => {
          this.setState({ rejectVisible: false });
        }}
        animationType="slide-up"
      >
        <div className="flexColumn h100 content">
          <div className="flex flexColumn" style={{ overflowY: 'auto' }}>
            <div className="pLeft10 mTop16 mBottom10 TxtLeft Gray bold">{_l('有%0个可否决的审批事项', rejectCards.length)}</div>
            {rejectCards.map(item => (
              <div className="pLeft10 pRight10" key={item.workId}>
                <Card
                  item={item}
                  type={filter ? filter.type : null}
                  time={createTimeSpan(item.workItem.receiveTime)}
                  currentTab={topTab ? topTab.id : bottomTab.id}
                  showApproveChecked={false}
                  batchApproval={batchApproval}
                  renderBodyTitle={() => {
                    return item.entityName ? `${item.entityName}: ${item.title}` : item.title;
                  }}
                  onClick={() => {
                    this.setState({
                      previewRecord: { instanceId: item.id, workId: item.workId },
                    });
                  }}
                />
              </div>
            ))}
            {!!noRejectCards.length && (
              <Fragment>
                <div className="pLeft10 mTop6 mBottom10 Gray_75 TxtLeft bold">{_l('不能否决事项')} {noRejectCards.length}</div>
                {noRejectCards.map(item => (
                  <div className="pLeft10 pRight10" key={item.workId}>
                    <Card
                      item={item}
                      type={filter ? filter.type : null}
                      time={createTimeSpan(item.workItem.receiveTime)}
                      currentTab={topTab ? topTab.id : bottomTab.id}
                      showApproveChecked={false}
                      batchApproval={batchApproval}
                      renderBodyTitle={() => {
                        return item.entityName ? `${item.entityName}: ${item.title}` : item.title;
                      }}
                      onClick={() => {
                        this.setState({
                          previewRecord: { instanceId: item.id, workId: item.workId },
                        });
                      }}
                    />
                  </div>
                ))}
              </Fragment>
            )}
          </div>
          <div className="flexRow valignWrapper pAll10 WhiteBG">
            <div
              className="closeBtn flex bold mRight10"
              onClick={() => {
                this.setState({ rejectVisible: false });
              }}
            >
              {_l('取消')}
            </div>
            <div
              className={cx('rejectApprove flex bold all')}
              onClick={() => {
                this.hanndleApprove(5, 'auth.overruleTypeList');
                this.setState({ rejectVisible: false });
              }}
            >
              <span className="mRight5">{_l('否决')}</span>
            </div>
          </div>
        </div>
      </ModalWrap>
    );
  }
  renderCount(tab) {
    const { countData, appCount } = this.state;
    const { appId } = getRequest();

    if (tab.id === 'waitingWrite') {
      if (appId) {
        return appCount.writeCount > 0 ? `(${appCount.writeCount})` : null;
      } else {
        return countData.waitingWrite > 0 ? `(${countData.waitingWrite})` : null;
      }
    }

    if (tab.id === 'waitingApproval') {
      if (appId) {
        return appCount.approveCount > 0 ? `(${appCount.approveCount})` : null;
      } else {
        return countData.waitingApproval > 0 ? `(${countData.waitingApproval})` : null;
      }
    }
  }
  renderInput() {
    const { searchValue } = this.state;
    return (
      <div className="searchWrapper valignWrapper">
        <Icon icon="search" className="Gray_75 Font20 pointer" />
        <input
          value={searchValue}
          type="text"
          placeholder={_l('搜索记录名称')}
          onChange={e => {
            this.setState({
              searchValue: e.target.value,
            });
          }}
          onKeyDown={event => {
            const { bottomTab, topTab } = this.state;
            if (topTab) {
              event.which === 13 && this.handleChangeTopTab(topTab);
            } else {
              event.which === 13 && this.handleChangeCompleteTab(bottomTab);
            }
          }}
        />
        {searchValue ? (
          <Icon
            icon="close"
            className="Gray_75 Font20 pointer"
            onClick={() => {
              this.setState(
                {
                  searchValue: '',
                },
                () => {
                  const { bottomTab, topTab } = this.state;
                  if (topTab) {
                    this.handleChangeTopTab(topTab);
                  } else {
                    this.handleChangeCompleteTab(bottomTab);
                  }
                },
              );
            }}
          />
        ) : null}
      </div>
    );
  }
  renderWithoutData() {
    return (
      <div className="withoutData">
        <div className="icnoWrapper">
          <Icon icon="ic-line" />
        </div>
        <span>{_l('暂无内容')}</span>
      </div>
    );
  }
  renderContent() {
    const { stateTab, batchApproval, list, loading, pageIndex, filter, bottomTab, topTab, approveCards } = this.state;
    return (
      <ScrollView className="flex" onScrollEnd={this.handleScrollEnd}>
        {list.map(item => (
          <div className="pLeft10 pRight10" key={item.workId}>
            <Card
              item={item}
              type={filter ? filter.type : null}
              time={createTimeSpan(item.workItem.receiveTime)}
              currentTab={topTab ? topTab.id : bottomTab.id}
              approveChecked={!_.isEmpty(_.find(approveCards, { workId: item.workId }))}
              batchApproval={batchApproval}
              renderBodyTitle={() => {
                return item.entityName ? `${item.entityName}: ${item.title}` : item.title;
              }}
              onClick={() => {
                this.setState({
                  previewRecord: { instanceId: item.id, workId: item.workId },
                });
              }}
              onApproveDone={this.handleApproveDone}
              onChangeApproveCards={e => {
                const { checked } = e.target;
                if (checked) {
                  this.setState({
                    approveCards: approveCards.concat(item),
                  });
                } else {
                  this.setState({
                    approveCards: approveCards.filter(n => n.workId !== item.workId),
                  });
                }
              }}
            />
          </div>
        ))}
        {loading ? (
          <div className={cx({ withoutData: pageIndex == 1 })}>
            <LoadDiv size="middle" />
          </div>
        ) : null}
        {!loading && _.isEmpty(list) ? this.renderWithoutData() : null}
      </ScrollView>
    );
  }
  render() {
    const {
      batchApproval,
      list,
      countData,
      bottomTab,
      topTab,
      previewRecord,
      approveCards,
      approveType,
      encryptType,
      rejectVisible,
    } = this.state;
    const currentTabs = bottomTab.tabs;
    const allowApproveList = list.filter(c => _.get(c, 'flowNode.batch'));
    const rejectList = approveCards.filter(c => _.get(c, 'flowNode.btnMap')[5]);
    return (
      <div className="processContent flexColumn h100">
        <div className="flex flexColumn">
          <div className="processTabs mBottom10 z-depth-1">
            <Tabs
              tabBarInactiveTextColor="#9e9e9e"
              tabs={currentTabs}
              page={topTab ? _.findIndex(currentTabs, { id: topTab.id }) : -1}
              onTabClick={this.handleChangeTopTab}
              renderTab={tab => (
                <span>
                  {tab.name} {this.renderCount(tab)}
                </span>
              )}
            />
            {batchApproval && (
              <div className="batchApprovalHeader valignWrapper Font16">
                <div className="bold">
                  {_l('待审批')}
                  {countData.waitingApproval && `(${countData.waitingApproval})`}
                </div>
                <a
                  onClick={() => {
                    this.setState({ batchApproval: false, approveCards: [] });
                  }}
                >
                  {_l('完成')}
                </a>
              </div>
            )}
          </div>
          {batchApproval && (
            <div className="batchApprovalFooter flexColumn">
              <div className="valignWrapper">
                <Checkbox
                  checked={allowApproveList.length && allowApproveList.length === approveCards.length}
                  className={cx({ checkboxDisabled: !allowApproveList.length })}
                  onChange={e => {
                    const { checked } = e.target;
                    if (checked) {
                      if (allowApproveList.length) {
                        alert(_l('全选%0条可批量审批的记录', allowApproveList.length), 1);
                        this.setState({ approveCards: allowApproveList });
                      } else {
                        alert(_l('没有可批量操作的审批事项'), 2);
                      }
                    } else {
                      this.setState({ approveCards: [] });
                    }
                  }}
                />
                <div className="mLeft5">
                  {_l('全选')}
                  {approveCards.length
                    ? _l('（已选择%0/%1条）', approveCards.length, list.length)
                    : list.length !== countData.waitingApproval && _l('（已加载%0条）', list.length)}
                </div>
              </div>
              <div className="valignWrapper mTop10">
                <div
                  className={cx('passApprove flex mRight10', { all: approveCards.length })}
                  onClick={() => {
                    this.hanndleApprove(4, 'auth.passTypeList');
                  }}
                >
                  {_l('通过')}
                </div>
                <div
                  className={cx('rejectApprove flex', { select: rejectList.length, all: approveCards.length && rejectList.length === approveCards.length })}
                  onClick={() => {
                    if (_.isEmpty(approveCards)) {
                      alert(_l('请先勾选需要处理的审批'), 2);
                    } else if (_.isEmpty(rejectList)) {
                      alert(_l('没有可否决的审批事项'), 2);
                    } else {
                      this.setState({ rejectVisible: true });
                    }
                  }}
                >
                  <span className="mRight5">{_l('否决')}</span>
                  {!(approveCards.length && rejectList.length === approveCards.length) && !!rejectList.length && rejectList.length}
                </div>
              </div>
            </div>
          )}
          {this.renderInput()}
          {this.renderContent()}
          <div className="processTabs bottomProcessTabs">
            <Tabs
              tabBarInactiveTextColor="#9e9e9e"
              tabs={tabs}
              page={bottomTab ? _.findIndex(tabs, { id: bottomTab.id }) : -1}
              onTabClick={this.handleChangeCompleteTab}
              renderTab={tab => (
                <div className="flexColumn valignWrapper">
                  <Icon className={tab.className} icon={tab.icon} />
                  <span className="Font12 mTop2">{tab.name}</span>
                </div>
              )}
            />
          </div>
        </div>
        {!batchApproval && (
          <Back
            style={{ bottom: 60 }}
            onClick={() => {
              history.back();
            }}
          />
        )}
        {!batchApproval && topTab && (topTab.id === 'waitingApproval' || topTab.id === 'waitingWrite') && (
          <ProcessDelegation topTab={topTab} className={cx({ bottom120: !list.length })} />
        )}
        {topTab && topTab.id === 'waitingApproval' && !batchApproval && !!list.length && (
          <Flex
            justify="center"
            align="center"
            className="card processBatchOperation"
            onClick={() => {
              this.setState({ batchApproval: true });
            }}
          >
            <Icon className="Font20 Gray_9e" icon="task-complete" />
          </Flex>
        )}
        <ProcessRecordInfo
          isModal
          className="full"
          visible={!_.isEmpty(previewRecord)}
          instanceId={previewRecord.instanceId}
          workId={previewRecord.workId}
          onClose={data => {
            if (data.id) {
              this.handleApproveDone(data);
            }
            this.setState({
              previewRecord: {},
            });
          }}
        />
        {(approveType || encryptType) && this.renderSignatureDialog()}
        {rejectVisible && this.renderRejectDialog()}
      </div>
    );
  }
}
