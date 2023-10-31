import React, { Component, Fragment } from 'react';
import { func, oneOf } from 'prop-types';
import { Motion, spring } from 'react-motion';
import { generate } from '@ant-design/colors';
import cx from 'classnames';
import DocumentTitle from 'react-document-title';
import { Icon, Menu, MenuItem, Skeleton } from 'ming-ui';
import { connect } from 'react-redux';
import RcDialog from 'rc-dialog';
import 'rc-dialog/assets/index.css';
import { navigateTo } from 'src/router/navigateTo';
import SelectIcon from 'src/pages/AppHomepage/components/SelectIcon';
import CopyApp from 'src/pages/AppHomepage/components/CopyApp';
import SvgIcon from 'src/components/SvgIcon';
import { changeAppColor, changeNavColor, setAppStatus, syncAppDetail } from 'src/pages/PageHeader/redux/action';
import { refreshSheetList } from 'worksheet/redux/actions/sheetList';
import api from 'api/homeApp';
import { Drawer, Modal } from 'antd';
import HomepageIcon from '../../components/HomepageIcon';
import IndexSide from '../../components/IndexSide';
import CommonUserHandle, { LeftCommonUserHandle } from '../../components/CommonUserHandle';
import PortalUserSet from 'src/pages/PageHeader/components/PortalUserSet';
import MyProcessEntry from '../../components/MyProcessEntry';
import { DROPDOWN_APP_CONFIG } from '../config';
import { getIds, compareProps, getItem, setItem, getAppConfig } from '../../util';
import EditAppIntro from './EditIntro';
import AppGroup from '../AppGroup';
import LeftAppGroup from '../LeftAppGroup';
import NavigationConfig from './NavigationConfig';
import './index.less';
import { getAppFeaturesVisible, getFeatureStatus, buriedUpgradeVersionDialog } from 'src/util';
import { getSheetListFirstId } from 'worksheet/util';
import AppAnalytics from 'src/pages/Admin/useAnalytics/components/AppAnalytics';
import { unlockAppLockPassword } from 'src/pages/AppSettings/components/LockApp/AppLockPasswordDialog';
import _ from 'lodash';
import { isHaveCharge, canEditApp, canEditData } from 'src/pages/worksheet/redux/actions/util.js';
import { APP_ROLE_TYPE } from 'src/pages/worksheet/constants/enum';
import { setFavicon } from 'src/util';

const mapStateToProps = ({ sheet, sheetList, appPkg: { appStatus } }) => ({ sheet, sheetList, appStatus });
const mapDispatchToProps = dispatch => ({
  syncAppDetail: detail => dispatch(syncAppDetail(detail)),
  updateColor: color => dispatch(changeAppColor(color)),
  updateNavColor: color => dispatch(changeNavColor(color)),
  setAppStatus: data => dispatch(setAppStatus(data)),
  refreshSheetList: () => dispatch(refreshSheetList()),
});
const rowInfoReg = /\/app\/(.*)\/(.*)(\/(.*))?\/row\/(.*)|\/app\/(.*)\/newrecord\/(.*)\/(.*)/;
const workflowDetailReg = /\/app\/(.*)\/workflowdetail\/record\/(.*)\/(.*)/;
const checkRecordInfo = url => rowInfoReg.test(url) || workflowDetailReg.test(url);

let mousePosition = { x: 139, y: 23 };
@connect(mapStateToProps, mapDispatchToProps)
export default class AppInfo extends Component {
  static propTypes = {
    appStatus: oneOf([0, 1, 2, 3, 4, 5]),
    updateColor: func,
    updateNavColor: func,
    syncAppDetail: func,
  };
  static defaultProps = {
    appStatus: 0,
    updateColor: _.noop,
    updateNavColor: _.noop,
    syncAppDetail: _.noop,
  };

  constructor(props) {
    super(props);
    const { appId } = getIds(props);
    const openedApps = getItem('openedApps');
    this.state = {
      indexSideVisible: false,
      appConfigVisible: false,
      modifyAppIconAndNameVisible: false,
      editAppIntroVisible: false,
      isEditing: false,
      isShowAppIntroFirst: !_.includes(openedApps, appId),
      navigationConfigVisible: false,
      copyAppVisible: false,
      data: {},
      hasChange: false,
      noUseBackupRestore: false,
      appAnalyticsVisible: false,
      modifyAppLockPasswordVisible: false,
      lockAppVisisble: false,
    };
  }

  componentDidMount() {
    this.ids = getIds(this.props);
    this.getData();
    const openedApps = getItem('openedApps') || [];
    const { appId } = this.ids;
    if (!_.includes(openedApps, appId)) {
      setItem('openedApps', openedApps.concat(appId));
    }
  }

  componentWillReceiveProps(nextProps) {
    this.ids = getIds(nextProps);
    if (compareProps(nextProps.match.params, this.props.match.params, ['appId'])) {
      this.getData();
    }
    if (
      (this.ids.appId === getIds(this.props).appId && checkRecordInfo(nextProps.location.pathname)) ||
      checkRecordInfo(this.props.location.pathname)
    ) {
      const { data } = this.state;
      const isRowInfo = checkRecordInfo(nextProps.location.pathname);
      const currentPcNaviStyle = isRowInfo ? 0 : data.pcNaviStyle;
      const appStatus = isRowInfo ? 0 : nextProps.appStatus;
      this.setState({
        data: {
          ...data,
          currentPcNaviStyle,
        },
      });
      this.props.syncAppDetail({ currentPcNaviStyle });
      this.props.setAppStatus(appStatus);
      this.checkNavigationStyle(currentPcNaviStyle);
    }
    if (
      this.ids.appId === getIds(this.props).appId &&
      compareProps(nextProps.match.params, this.props.match.params, ['worksheetId'])
    ) {
      const { currentPcNaviStyle } = this.state.data;
      currentPcNaviStyle === 2 && this.checkIsFull(nextProps.match.params.worksheetId);
    }
  }

  componentWillUnmount() {
    clearTimeout(this.clickTimer);
    $('[rel="icon"]').attr('href', '/favicon.png');
    document.querySelector('body').classList.remove('leftNavigationStyleWrap');
  }

  checkIsFull = worksheetId => {
    if (worksheetId) {
      document.querySelector('#wrapper').classList.add('fullWrapper');
    } else {
      document.querySelector('#wrapper').classList.remove('fullWrapper');
    }
  };

  checkNavigationStyle = currentPcNaviStyle => {
    if (currentPcNaviStyle === 1) {
      document.querySelector('body').classList.add('leftNavigationStyleWrap');
    } else {
      document.querySelector('body').classList.remove('leftNavigationStyleWrap');
    }
  };

  getThemeType = (iconColor = '#616161', navColor) => {
    const lightColor = generate(iconColor)[0];
    if ([lightColor, '#ffffff', '#f5f6f7'].includes(navColor)) {
      return 'light';
    }
    if ('#1b2025' === navColor) {
      return 'black';
    }
    return 'theme';
  };

  getData = () => {
    const { syncAppDetail } = this.props;
    const { appId, worksheetId } = this.ids;
    if (!appId) return;
    api
      .getApp(
        {
          appId: md.global.Account.isPortal ? md.global.Account.appId : appId,
          getSection: true,
          getManager: window.isPublicApp ? false : true,
        },
        { silent: true },
      )
      .then(data => {
        data.currentPcNaviStyle = checkRecordInfo(location.pathname) ? 0 : data.pcNaviStyle;
        data.themeType = this.getThemeType(data.iconColor, data.navColor);

        this.setState({ data });
        // 同步应用信息至工作表
        const appDetail = _.pick(data, [
          'navColor',
          'iconColor',
          'lightColor',
          'iconUrl',
          'projectId',
          'name',
          'id',
          'fixed',
          'fixRemark',
          'fixAccount',
          'isLock',
          'permissionType',
          'appDisplay',
          'webMobileDisplay',
          'pcDisplay',
          'pcNaviStyle',
          'currentPcNaviStyle',
          'themeType',
          'viewHideNavi',
          'managers',
          'selectAppItmeType',
        ]);
        syncAppDetail(appDetail);
        this.checkNavigationStyle(data.currentPcNaviStyle);
        if (data.currentPcNaviStyle === 2) {
          this.checkIsFull(worksheetId);
        } else {
          document.querySelector('#wrapper').classList.remove('fullWrapper');
        }
        window.appInfo = data;
        this.dataCache = _.pick(data, ['icon', 'iconColor', 'name']);
        setFavicon(data.iconUrl, data.iconColor);
      });
  };

  switchVisible = (obj, cb) => {
    this.setState(obj, cb);
  };

  updateData = obj => {
    const { data } = this.state;
    const nextData = { ...data, ...obj };
    this.setState({ data: nextData });
  };

  handleAppConfigClick = type => {
    this.setState({ appConfigVisible: false, [type]: true, isEditing: true });
  };

  handleAppIconAndNameChange = obj => {
    const isSame = this.dataCache && Object.keys(obj).every(key => obj[key] === this.dataCache[key]);
    if (!isSame) {
      this.updateAppDetail(obj);
    }
  };

  updateAppDetail = obj => {
    const { appId, groupId } = this.ids;
    const current = _.pick(this.state.data, ['projectId', 'iconColor', 'navColor', 'icon', 'description', 'name']);
    if (!obj.name) obj = _.omit(obj, 'name');
    const para = { ...current, ...obj };
    api.editAppInfo({ appId, ...para }).then(({ data }) => {
      this.dataCache = _.pick(para, ['icon', 'iconColor', 'navColor', 'name']);
      if (data) this.updateData(obj);
      if ('pcNaviStyle' in obj && obj.pcNaviStyle !== this.state.data.currentPcNaviStyle) {
        if (obj.pcNaviStyle === 2) {
          location.href = `/app/${appId}/${groupId || ''}`;
        } else {
          window.location.reload();
        }
      }
    });
  };
  // 编辑应用详情
  handleEditApp = (type, obj) => {
    this.switchVisible({ [type]: false, isShowAppIntroFirst: false });
    this.updateAppDetail(obj);
  };

  handleModify = obj => {
    const { data } = this.state;
    if (obj.name === '') {
      obj = { ...obj, name: this.dataCache.name };
    }
    if (obj.iconColor) {
      this.props.updateColor(obj.iconColor);
    }
    if (obj.navColor) {
      this.props.updateNavColor(obj.navColor);
      obj.themeType = this.getThemeType(obj.iconColor, obj.navColor);
    }
    this.props.syncAppDetail(obj);
    this.updateData(obj);
  };

  handleAppNameClick = e => {
    e.stopPropagation();
    const { currentPcNaviStyle } = this.state.data;
    const { location, sheet, sheetList } = this.props;
    if (/row|role|workflow|newrecord/.test(location.pathname)) {
      const { appId } = getIds(this.props);
      navigateTo(`/app/${appId}`);
      return;
    }
    const { base, views, isCharge } = sheet;
    const { data, appSectionDetail } = sheetList;
    const { worksheetId, viewId, appId, groupId = '' } = base;
    const firstSheetId =
      currentPcNaviStyle === 2
        ? ''
        : getSheetListFirstId(currentPcNaviStyle === 1 ? appSectionDetail : data, isCharge) || '';

    if (appId && worksheetId !== firstSheetId) {
      navigateTo(`/app/${appId}/${groupId}/${firstSheetId}`);
      return;
    }
    const { viewId: firstViewId } = _.head(views) || {};
    if (appId && worksheetId === firstSheetId && viewId !== firstViewId) {
      navigateTo(`/app/${appId}/${groupId}/${firstSheetId}/${firstViewId}`);
    }
  };

  renderMenu = ({ type, icon, text, action, ...rest }) => {
    const { data } = this.state;
    const { projectId, isLock, isPassword, permissionType } = data;
    const canLock = _.includes(
      [
        APP_ROLE_TYPE.ADMIN_ROLE,
        APP_ROLE_TYPE.DEVELOPERS_ROLE,
        APP_ROLE_TYPE.RUNNER_DEVELOPERS_ROLE,
        APP_ROLE_TYPE.POSSESS_ROLE,
      ],
      permissionType,
    );

    if (type === 'unlockApp' && !(canLock && isPassword)) return;

    if (rest.featureId) {
      const featureType = getFeatureStatus(projectId, rest.featureId);
      if (!featureType) return;
    }

    if (_.includes(['appAnalytics', 'copy', 'worksheetapi', 'modifyAppLockPassword'], type)) {
      return (
        <React.Fragment>
          <div style={{ width: '100%', margin: '6px 0', borderTop: '1px solid #EAEAEA' }} />
          {this.renderMenuHtml({ type, icon, text, action, ...rest })}
        </React.Fragment>
      );
    }

    return this.renderMenuHtml({ type, icon, text, action, ...rest });
  };

  toSetEnterpirse = () => {
    const { projectId } = this.state.data;
    navigateTo(`/admin/workwxapp/${projectId}`);
    this.setState({ noIntegratedWechat: false });
  };
  submitApply = () => {
    const { projectId, appId } = this.state.data;
    editWorkWXAlternativeAppStatus({
      projectId,
      appId,
    }).then(res => {
      if (res) {
        alert(_l('提交申请成功'));
      } else {
        alert(_l('提交申请失败'), 2);
      }
    });
    this.setState({ integratedWechat: false });
  };

  renderMenuHtml = ({ type, icon, text, action, ...rest }) => {
    const { appId } = this.ids;
    const { projectId, sourceType, permissionType, isPassword, isLock } = this.state.data;
    const featureType = getFeatureStatus(projectId, rest.featureId);
    const isOwner = permissionType === APP_ROLE_TYPE.POSSESS_ROLE;

    return (
      <MenuItem
        key={type}
        className={cx('appConfigItem', type)}
        icon={<Icon className="appConfigItemIcon Font18" icon={icon} />}
        onClick={e => {
          e.stopPropagation();
          this.setState({ appConfigVisible: false });

          if (_.includes(['appAnalytics', 'appLogs'], type) && getFeatureStatus(projectId, rest.featureId) === '2') {
            buriedUpgradeVersionDialog(projectId, rest.featureId);
            return;
          }

          if (type === 'appAnalytics') {
            window.open(`/app/${appId}/analytics/${projectId}`, '__blank');
            return;
          }
          if (type === 'appLogs') {
            window.open(`/app/${appId}/logs/${projectId}`, '__blank');
            return;
          }
          if (type === 'modifyAppLockPassword') {
            unlockAppLockPassword({
              appId,
              sourceType,
              isPassword,
              isOwner,
              isLock,
              refreshPage: () => {
                location.reload();
              },
            });
            return;
          }
          // API开发文档
          if (type === 'worksheetapi') {
            window.open(`/worksheetapi/${appId}`);
            return;
          }
          if (type === 'appManageMenu') {
            navigateTo(`/app/${appId}/settings/options`);
            return;
          }

          this.handleAppConfigClick(action);
        }}
        {...rest}
      >
        <span>{text}</span>
        {_.includes(['appAnalytics', 'appLogs'], type) && featureType === '2' && (
          <icon className="icon-auto_awesome Font16 mLeft6" style={{ color: '#fcb400' }} />
        )}
        {type === 'worksheetapi' && <Icon icon="external_collaboration" className="mLeft10 worksheetapiIcon" />}
      </MenuItem>
    );
  };

  changeIndexVisible = (visible = true) => {
    this.timer = setTimeout(() => {
      if (window.disabledSideButton) return;
      this.setState({ indexSideVisible: visible });
    }, 100);
  };

  closeNavigationConfigVisible = () => {
    const { data } = this.state;
    this.switchVisible({ navigationConfigVisible: false });
    window.updateAppGroups && window.updateAppGroups();
    this.props.refreshSheetList();
  };

  renderAppInfoWrap = () => {
    const { appStatus, ...props } = this.props;
    const { appConfigVisible, modifyAppIconAndNameVisible, data } = this.state;
    const {
      id: appId,
      name,
      iconUrl,
      navColor,
      iconColor,
      description,
      permissionType,
      isLock,
      isPassword,
      projectId,
      fixed,
      pcDisplay,
      currentPcNaviStyle,
      themeType,
      sourceType,
    } = data;
    const isNormalApp = _.includes([1, 5], appStatus);
    const { s, tb, tr } = getAppFeaturesVisible();
    let list = getAppConfig(DROPDOWN_APP_CONFIG, permissionType) || [];
    const isAuthorityApp = canEditApp(permissionType, isLock);
    const canLock = _.includes(
      [
        APP_ROLE_TYPE.ADMIN_ROLE,
        APP_ROLE_TYPE.DEVELOPERS_ROLE,
        APP_ROLE_TYPE.RUNNER_DEVELOPERS_ROLE,
        APP_ROLE_TYPE.POSSESS_ROLE,
      ],
      permissionType,
    );

    if ((_.find(md.global.Account.projects, o => o.projectId === projectId) || {}).cannotCreateApp) {
      _.remove(list, o => o.type === 'copy');
    }
    // 加锁应用不限制 修改应用名称和外观、编辑应用说明、使用说明、日志（8.2）
    if (isLock && isPassword && canLock) {
      list = _.filter(list, it =>
        _.includes(['modify', 'editIntro', 'appAnalytics', 'appLogs', 'modifyAppLockPassword'], it.type),
      );
    } else {
      list = _.filter(list, it => !_.includes(['modifyAppLockPassword'], it.type));
    }

    const renderHomepageIconWrap = () => {
      return (
        <div
          className="homepageIconWrap"
          onClick={() => {
            window.disabledSideButton = false;
            this.changeIndexVisible();
          }}
          onMouseEnter={this.changeIndexVisible}
          onMouseLeave={() => {
            window.disabledSideButton = false;
            clearTimeout(this.timer);
          }}
        >
          <HomepageIcon />
        </div>
      );
    };

    const renderAppDetailWrap = () => {
      return (
        <Fragment>
          {tb && (
            <div
              className={cx('appDetailWrap pointer overflowHidden')}
              onDoubleClick={e => {
                e.stopPropagation();
                if (canEditApp(permissionType, isLock) && isNormalApp) {
                  this.setState({ modifyAppIconAndNameVisible: true });
                }
              }}
            >
              <div className="appIconAndName pointer overflow_ellipsis" onClick={this.handleAppNameClick}>
                <div className="appIconWrap">
                  <SvgIcon
                    url={iconUrl}
                    fill={['black', 'light'].includes(themeType) ? iconColor : '#FFF'}
                    size={currentPcNaviStyle === 1 ? 28 : 24}
                  />
                </div>
                <span className="appName overflow_ellipsis">{name}</span>
              </div>
            </div>
          )}
          {!(pcDisplay && !isAuthorityApp) && fixed && <div className="appFixed">{_l('维护中')}</div>}
          {((isNormalApp && (canEditApp(permissionType, isLock) || canEditData(permissionType)) && tb) ||
            (isLock && canLock)) && (
            <div
              className="appConfigIcon pointer"
              onClick={() => {
                this.setState({ appConfigVisible: true });
              }}
            >
              <Icon icon="expand_more" className="Font18" style={{ lineHeight: 'inherit' }} />
              {appConfigVisible && (
                <Menu
                  style={{ top: '45px', width: '220px', padding: '6px 0' }}
                  onClickAway={() => this.setState({ appConfigVisible: false })}
                >
                  {list.map(({ type, icon, text, action, ...rest }) => {
                    return this.renderMenu({ type, icon, text, action, ...rest });
                  })}
                </Menu>
              )}
            </div>
          )}
          {(isHaveCharge(permissionType, isLock) ? description : true) && isNormalApp && (
            <div
              className="appIntroWrap pointer"
              data-tip={_l('应用说明')}
              onClick={e => {
                mousePosition = { x: e.pageX, y: e.pageY };
                this.setState({ editAppIntroVisible: true, isEditing: false });
              }}
            >
              <Icon className="appIntroIcon Font16" icon="info" />
            </div>
          )}
          {modifyAppIconAndNameVisible && (
            <SelectIcon
              projectId={projectId}
              {..._.pick(data, ['icon', 'iconColor', 'name', 'navColor'])}
              className="modifyAppInfo"
              onNameInput={this.handleNameInput}
              onModify={this.handleModify}
              onChange={this.handleAppIconAndNameChange}
              onClose={() => this.switchVisible({ selectIconVisible: false })}
              onClickAway={() => this.switchVisible({ modifyAppIconAndNameVisible: false })}
              onClickAwayExceptions={['.mui-dialog-container']}
              onShowNavigationConfig={
                canEditApp(permissionType, isLock)
                  ? () => {
                      this.setState({ navigationConfigVisible: true });
                    }
                  : null
              }
            />
          )}
        </Fragment>
      );
    };

    if (currentPcNaviStyle === 1) {
      const renderContent = (count, onClick) => {
        return (
          <div className="flexRow alignItemsCenter pointer White backlogWrap" onClick={onClick}>
            <Icon icon="task_alt" className="Font18" />
            <div className="mLeft5 mRight5 bold">{_l('待办')}</div>
            {!!count && <div className="count">{count}</div>}
          </div>
        );
      };
      return (
        <div className="appInfoWrap flexColumn pLeft10 pRight10">
          <div className="flexRow alignItemsCenter pTop10">
            <div className="flex">
              {!(window.isPublicApp || !s || md.global.Account.isPortal) && renderHomepageIconWrap()}
            </div>
            {!(md.global.Account.isPortal || window.isPublicApp) && tr && (
              <MyProcessEntry type="appPkg" renderContent={renderContent} />
            )}
          </div>
          <div className="flexRow alignItemsCenter pTop10 Relative">{renderAppDetailWrap()}</div>
        </div>
      );
    } else {
      return (
        <div className="appInfoWrap flexRow alignItemsCenter">
          {window.isPublicApp || !s || md.global.Account.isPortal ? (
            <div className="mLeft16" />
          ) : (
            renderHomepageIconWrap()
          )}
          {renderAppDetailWrap()}
        </div>
      );
    }
  };

  render() {
    const { appStatus, ...props } = this.props;
    const {
      indexSideVisible,
      editAppIntroVisible,
      isEditing,
      navigationConfigVisible,
      isShowAppIntroFirst,
      copyAppVisible,
      data,
      isAutofucus,
      appAnalyticsVisible,
    } = this.state;
    const {
      id: appId,
      iconColor = '#616161',
      navColor = '#616161',
      name,
      iconUrl,
      description,
      permissionType,
      isLock,
      projectId,
      fixed,
      pcDisplay,
      currentPcNaviStyle,
      themeType,
    } = data;
    const isNormalApp = _.includes([1, 5], appStatus);
    const isAuthorityApp = canEditApp(permissionType, isLock);
    const hasCharge = canEditApp(permissionType) || canEditData(permissionType);
    const AppGroupComponent = currentPcNaviStyle === 1 ? LeftAppGroup : AppGroup;

    // loading 不展示导航
    if (_.isEmpty(data)) {
      return null;
    }
    return (
      <div
        className={cx('appPkgHeaderWrap', themeType)}
        style={{
          backgroundColor: navColor,
          width: currentPcNaviStyle === 1 ? 240 : undefined,
        }}
      >
        <DocumentTitle title={name} />
        {this.renderAppInfoWrap()}
        {!(fixed && !hasCharge) && !(pcDisplay && !hasCharge) && (
          <AppGroupComponent
            appStatus={appStatus}
            projectId={projectId}
            appPkg={data}
            {...props}
            {..._.pick(data, ['permissionType', 'isLock'])}
          />
        )}
        {currentPcNaviStyle === 1 && (pcDisplay || fixed) && !isAuthorityApp && (
          <div className="LeftAppGroupWrap w100 h100">
            <Skeleton active={false} />
          </div>
        )}
        {currentPcNaviStyle === 1 && (
          <Fragment>
            <div className="topRadius" style={{ color: navColor }} />
            <div className="bottomRadius" style={{ color: navColor }} />
            {themeType === 'light' && (
              <Fragment>
                <svg className="topBorderRadius" width="14px" height="22px" viewBox="0 0 14 22" version="1.1">
                  <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                    <path
                      d="M0.5,22 L0.5,13.9851088 C0.503434088,13.8199063 0.5,13.6531791 0.5,13.4856816 C0.5,6.59003004 6.32029825,1 13.5,1"
                      stroke="#0000001a"
                    ></path>
                  </g>
                </svg>
                <div className="borderLine" />
                <svg className="bottomBorderRadius" width="14px" height="22px" viewBox="0 0 14 22" version="1.1">
                  <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                    <path
                      d="M0.5,21 L0.5,12.9851088 C0.503434088,12.8199063 0.5,12.6531791 0.5,12.4856816 C0.5,5.59003004 6.32029825,0 13.5,0"
                      stroke="#0000001a"
                      transform="translate(7.000000, 10.500000) scale(1, -1) translate(-7.000000, -10.500000) "
                    ></path>
                  </g>
                </svg>
              </Fragment>
            )}
          </Fragment>
        )}
        {/* 当应用状态正常且应用描述有值且第一次进入此应用会弹出编辑框 */}
        <RcDialog
          zIndex={1000}
          className="appIntroDialog"
          wrapClassName={cx('appIntroDialogWrapCenter', { preview: !isEditing })}
          visible={editAppIntroVisible || (!window.isPublicApp && isShowAppIntroFirst && description && isNormalApp)}
          onClose={() => this.switchVisible({ editAppIntroVisible: false, isShowAppIntroFirst: false })}
          animation="zoom"
          style={{ width: '800px' }}
          maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          bodyStyle={{ padding: 0 }}
          maskAnimation="fade"
          mousePosition={mousePosition}
          closeIcon={<Icon icon="close" />}
        >
          <EditAppIntro
            cacheKey="appIntroDescription"
            data={data}
            description={description}
            permissionType={permissionType}
            isLock={isLock}
            // isEditing={!description && isAuthorityApp}
            isEditing={isEditing}
            changeEditState={isEditing => {
              this.setState({ isEditing });
            }}
            changeSetting={() => {
              this.setState({
                hasChange: true,
              });
            }}
            onSave={value => {
              this.handleEditApp('', { description: !value ? (this.state.hasChange ? value : description) : value });
              this.setState({
                hasChange: false,
              });
              this.switchVisible({ isShowAppIntroFirst: false, hasChange: false });
            }}
            onCancel={() =>
              this.switchVisible({ editAppIntroVisible: false, isShowAppIntroFirst: false, hasChange: false })
            }
          />
        </RcDialog>
        {copyAppVisible && (
          <CopyApp title={name} para={{ appId }} onCancel={() => this.switchVisible({ copyAppVisible: false })} />
        )}

        <Drawer
          bodyStyle={{ display: 'flex', flexDirection: 'column', padding: '0' }}
          width={900}
          title={null}
          visible={navigationConfigVisible}
          destroyOnClose={true}
          closeIcon={null}
          onClose={this.closeNavigationConfigVisible}
          placement="right"
        >
          <NavigationConfig
            app={data}
            onChangeApp={value => {
              const result = { ...data, ...value };
              this.setState({
                data: result,
              });
              this.updateAppDetail(value);
              this.props.syncAppDetail(result);
            }}
            visible={navigationConfigVisible}
            onClose={this.closeNavigationConfigVisible}
          />
        </Drawer>
        <Motion style={{ x: spring(indexSideVisible ? 0 : -352) }}>
          {({ x }) => (
            <IndexSide
              posX={x}
              visible={indexSideVisible}
              onClose={() => this.setState({ indexSideVisible: false })}
              onClickAway={() => indexSideVisible && this.setState({ indexSideVisible: false })}
            />
          )}
        </Motion>
        {md.global.Account.isPortal ? (
          <PortalUserSet
            appId={md.global.Account.appId}
            name={data.name}
            iconColor={data.iconColor}
            currentPcNaviStyle={currentPcNaviStyle}
          />
        ) : currentPcNaviStyle === 1 ? (
          <LeftCommonUserHandle type="appPkg" isAuthorityApp={isAuthorityApp} data={data} {...props} />
        ) : (
          <CommonUserHandle type="appPkg" {...props} />
        )}
        {appAnalyticsVisible && (
          <AppAnalytics
            currentAppInfo={{ appId, name, iconColor, iconUrl }}
            projectId={projectId}
            onCancel={() => {
              this.setState({ appAnalyticsVisible: false });
            }}
          />
        )}
      </div>
    );
  }
}
