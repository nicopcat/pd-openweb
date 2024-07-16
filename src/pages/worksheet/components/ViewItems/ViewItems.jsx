import React, { Component, Fragment } from 'react';
import cx from 'classnames';
import _ from 'lodash';
import { SortableContainer, SortableElement, arrayMove } from '@mdfe/react-sortable-hoc';
import { Tooltip, Icon, Dialog, Input } from 'ming-ui';
import Trigger from 'rc-trigger';
import 'rc-trigger/assets/index.css';
import sheetAjax from 'src/api/worksheet';
import { VIEW_DISPLAY_TYPE, VIEW_TYPE_ICON } from 'worksheet/constants/enum';
import { getDefaultViewSet } from 'worksheet/constants/common';
import AddViewDisplayMenu from './AddViewDisplayMenu';
import './ViewItems.less';
import Item from './Item';
import { Drawer } from 'antd';
import { withRouter } from 'react-router-dom';
import HideItem from './HideItem';
import styled from 'styled-components';
import { navigateTo } from 'src/router/navigateTo';

const EmptyData = styled.div`
  font-size: 12px;
  color: #9e9e9e;
  text-align: center;
  margin-top: 120px;
`;

const confirm = Dialog.confirm;

const SortableItem = SortableElement(({ ...props }) => {
  return <Item {...props} />;
});

const SortableList = SortableContainer(({ list, onScroll, ...other }) => {
  return (
    <div className="viewsScroll" onScroll={onScroll}>
      <div className="stance" />
      {list.map((item, index) => (
        <SortableItem key={index} index={index} item={item} list={list} {...other} />
      ))}
      <div className="stance" />
    </div>
  );
});

const SortHiddenListItem = SortableElement(({ ...props }) => {
  return <HideItem {...props} />;
});

const SortHiddenListContainer = SortableContainer(({ children, type = 'drawerWorksheetShowList' }) => {
  return <ul className={type}>{children}</ul>;
});
@withRouter
export default class ViewItems extends Component {
  static defaultProps = {
    viewList: [],
  };
  constructor(props) {
    super(props);
    this.state = {
      directionVisible: false,
      hideDirection: 'left',
      addMenuVisible: false,
      setWorksheetHidden: false,
      searchWorksheetListValue: undefined,
      sideMenuVisible: false,
      hasClickDrawe: false,
    };
    this.searchRef = React.createRef();
    this.containerWrapper = document.getElementById('wrapper');
    this.containerWrapper.addEventListener('click', this.clickDrawerArea);
  }
  componentWillReceiveProps(nextProps) {
    if (nextProps.sheetInfoLoading && !this.props.sheetInfoLoading) {
      this.flag = null;
      this.setState({
        directionVisible: false,
      });
    }
    if (nextProps.viewList.length !== this.props.viewList.length) {
      this.flag = null;
    }

    if (nextProps.currentViewId !== this.props.currentViewId) {
      const elem = $(`.workSheetViewsWrapper .viewsScroll .workSheetViewItemViewId-${nextProps.currentViewId}`);

      if (elem[0]) {
        setTimeout(() => {
          elem[0].scrollIntoView();
        }, 500);
      }
    }
    this.computeDirectionVisible();
  }
  componentDidUpdate() {
    if (!this.flag) {
      this.computeDirectionVisible();
    }
  }
  componentWillUnmount() {
    this.containerWrapper.removeEventListener('click', this.clickDrawerArea);
  }
  clickDrawerArea = e => {
    const { setWorksheetHidden } = this.state;
    this.setState({
      hasClickDrawe: false,
    });
    if (!setWorksheetHidden) return;
    let rect = document.querySelector('.drawerWorksheetHidden', 1).getBoundingClientRect();
    if (rect.right > e.clientX && e.clientX > rect.left && rect.bottom > e.clientY && e.clientY > rect.top) {
      return;
    } else {
      this.setState({
        setWorksheetHidden: false,
        hasClickDrawe: true,
      });
    }
  };
  getWorksheetViews(worksheetId) {
    const { appId } = this.props;
    sheetAjax
      .getWorksheetViews({
        appId,
        worksheetId,
      })
      .then(res => {
        this.props.updateViewList(res, res[0]);
        this.computeDirectionVisible();
      })
      .catch(err => {
        alert(_l('获取视图列表失败'), 2);
      });
  }
  handleAddView = data => {
    const { id = 'sheet', name } = data;
    const { worksheetId, viewList, appId, worksheetControls, worksheetInfo } = this.props;
    const titleControl = _.get(
      _.find(worksheetControls, item => item.attribute === 1),
      'controlId',
    );
    const defaultDisplayControls = worksheetControls
      .filter(item => item.controlId !== titleControl && !_.includes([22, 43, 10010, 45, 51], item.type)) //卡片上不显示的类型
      .map(item => item.controlId);
    const coverId = _.get(
      _.find(worksheetControls, item => item.type === 14),
      'controlId',
    );
    const coverCid =
      id === 'gallery'
        ? _.get(worksheetInfo, ['advancedSetting', 'coverid']) || //默认取表单设置里的封面
          coverId
        : coverId;
    const viewType = VIEW_DISPLAY_TYPE[id];
    const view = _.find(VIEW_TYPE_ICON, { id }) || {};
    const viewTypeCount = viewList.filter(n => n.viewType == viewType).length;
    let params = {
      viewId: '',
      appId,
      viewType,
      displayControls: _.slice(defaultDisplayControls, 0, 2),
      coverCid,
      name: viewList.length ? `${name || view.text}${viewTypeCount ? viewTypeCount : ''}` : _l('视图'),
      sortType: 0,
      coverType: 0,
      worksheetId,
      controls: [],
      filters: [],
      sortCid: '',
      showControlName: true, // 新创建的表格默认 显示字段名称
    };
    if (id === 'customize') {
      // pluginSource 插件来源 0:开发 1:已发布
      const { pluginId, pluginName, pluginIcon, pluginIconColor, pluginSource, isNew } = data;
      const viewCustomViewCount = viewList.filter(
        n => (pluginId && _.get(n, 'pluginInfo.id') == pluginId) || n.name.indexOf(pluginName) >= 0,
      ).length;
      const newName = `${pluginName}${viewCustomViewCount > 0 ? viewCustomViewCount : ''}`; //插件视图的视图名称默认用插件名称
      params = {
        ...params,
        pluginId,
        pluginName: isNew ? newName : pluginName,
        pluginIcon,
        pluginIconColor,
        pluginSource,
        projectId: _.get(this.props, 'worksheetInfo.projectId'),
        name: newName,
      };
    }
    params = getDefaultViewSet(params);
    sheetAjax
      .saveWorksheetView(Object.assign({}, params))
      .then(result => {
        const newViewList = viewList.concat(result);
        this.props.onAddView(newViewList, result);
        this.handleScrollPosition(0);
      })
      .catch(err => {
        alert(_l('新建视图失败'), 2);
      });
  };
  handleRemoveView = view => {
    const { viewList, appId, worksheetId } = this.props;
    if (viewList.filter(o => ![21].includes(o.viewType)).length === 1 && ![21].includes(view.viewType)) {
      alert(_l('必须保留一个默认视图'), 3);
      return;
    }
    confirm({
      title: <span className="Red">{_l('确定删除此视图吗？')}</span>,
      okText: _l('删除'),
      buttonType: 'danger',
      onOk: () => {
        sheetAjax
          .deleteWorksheetView({
            appId,
            viewId: view.viewId,
            worksheetId,
          })
          .then(result => {
            this.props.onRemoveView(
              viewList.filter(item => item.viewId !== view.viewId),
              view.viewId,
            );
            this.handleScrollPosition(0);
          })
          .catch(err => {
            alert(_l('删除视图失败'), 2);
          });
      },
    });
  };
  handleOpenView = view => {
    this.props.onViewConfigVisible(view);
  };
  handleCopyView = view => {
    const { viewList, appId, worksheetId } = this.props;
    window.clearLocalDataTime({ requestData: { worksheetId }, clearSpecificKey: 'Worksheet_GetWorksheetInfo' });
    sheetAjax
      .copyWorksheetView({
        appId,
        viewId: view.viewId,
      })
      .then(result => {
        const list = viewList.slice();
        const newIndex = _.findIndex(list, { viewId: view.viewId });
        list.splice(newIndex + 1, 0, result);
        this.handleSortViews(list);
        this.props.onAddView(list, result);
      })
      .catch(err => {
        alert(_l('复制视图失败'), 2);
      });
  };
  handleSortViews = views => {
    const { appId, worksheetId } = this.props;
    sheetAjax
      .sortWorksheetViews({
        appId,
        worksheetId,
        viewIds: views.map(view => view.viewId),
      })
      .then(result => {});
  };
  computeDirectionVisible() {
    if (!this.scrollWraperEl) return;
    const viewsScrollEl = this.scrollWraperEl.querySelector('.viewsScroll');
    if (viewsScrollEl) {
      const { offsetWidth, scrollWidth } = viewsScrollEl;
      this.flag = true;
      this.setState({
        directionVisible: offsetWidth < scrollWidth,
      });
    }
  }
  handleScrollPosition = (direction = 0) => {
    if (!this.scrollWraperEl) return;
    const { clientWidth } = this.scrollWraperEl;
    const distance = direction ? clientWidth / 2 : -(clientWidth / 2);
    const viewsScrollEl = this.scrollWraperEl.querySelector('.viewsScroll');
    const { scrollLeft } = viewsScrollEl;
    viewsScrollEl.scrollLeft = scrollLeft + distance;
  };
  updateScrollBtnState = () => {
    const { hideDirection } = this.state;
    const viewsScrollEl = this.scrollWraperEl.querySelector('.viewsScroll');
    const { scrollWidth, scrollLeft, offsetWidth } = viewsScrollEl;
    const width = scrollLeft + offsetWidth;
    if (!scrollLeft && hideDirection !== 'left') {
      this.setState({
        hideDirection: 'left',
      });
      return;
    }
    if (width === scrollWidth && hideDirection !== 'right') {
      this.setState({
        hideDirection: 'right',
      });
      return;
    }
    if (scrollLeft && width < scrollWidth && hideDirection !== null) {
      this.setState({
        hideDirection: null,
      });
    }
  };
  handleSortEnd = ({ oldIndex, newIndex }) => {
    if (oldIndex === newIndex) return;
    const { viewList, worksheetId, appId } = this.props;
    const newViewList = arrayMove(viewList, oldIndex, newIndex);
    this.props.updateViewList(newViewList);
    sheetAjax
      .sortWorksheetViews({
        appId,
        worksheetId,
        viewIds: newViewList.map(item => item.viewId),
      })
      .then(result => {})
      .catch(err => {
        alert(_l('退拽排序视图失败'), 2);
      });
  };
  updateViewName = view => {
    this.props.updateCurrentView(
      {
        appId: this.props.appId,
        ...view,
        name: view.name,
        editAttrs: ['name'],
      },
      false,
    );
  };
  handleAdd = data => {
    this.handleAddView(data);
    this.setState({ addMenuVisible: false });
  };
  updateAdvancedSetting = data => {
    this.props.updateCurrentView(
      {
        appId: this.props.appId,
        ...data,
      },
      false,
    );
  };

  handleAutoFocus = () => {
    setTimeout(() => {
      this.searchRef.current.focus();
    }, 0);
  };

  changeWorksheetHidden = e => {
    const { setWorksheetHidden, hasClickDrawe } = this.state;
    if (hasClickDrawe && !setWorksheetHidden) {
      return;
    }
    this.setState({
      setWorksheetHidden: true,
      hasClickDrawe: false,
    });
    this.handleAutoFocus();
  };

  render() {
    const { directionVisible, hideDirection, addMenuVisible, setWorksheetHidden, searchWorksheetListValue } =
      this.state;
    const { viewList, currentViewId, isCharge, changeViewDisplayType, sheetSwitchPermit, getNavigateUrl, isLock } =
      this.props;
    const isEmpty =
      searchWorksheetListValue &&
      _.isEmpty(
        viewList
          .filter(l => isCharge || (_.get(l, 'advancedSetting.showhide') || '').search(/hide|hpc/g) < 0)
          .filter(l => l.name.includes(_.trim(searchWorksheetListValue))),
      );
    const currentViewHideValue = _.get(
      viewList.find(l => l.viewId === currentViewId) || {},
      'advancedSetting.showhide',
    );

    return (
      <div className="valignWrapper flex">
        <div>
          <Tooltip popupPlacement="bottom" text={<span>{_l('全部视图%05005')}</span>}>
            <Icon
              icon="menu-02"
              className={cx('Font14 mLeft10 pointer Gray_75 allVieListwIcon hoverGray', {
                menuVisible: setWorksheetHidden,
                currentIsHide: currentViewHideValue && currentViewHideValue.search(/hpc|hide/g) > -1,
              })}
              onClick={e => this.changeWorksheetHidden(e)}
            />
          </Tooltip>
          <Drawer
            title=""
            width={280}
            className="drawerWorksheetHidden"
            placement="left"
            mask={false}
            closable={false}
            getContainer={() => document.querySelector('#worksheetRightContentBox')}
            style={{ position: 'absolute' }}
            onClose={() => this.setState({ setWorksheetHidden: false })}
            visible={setWorksheetHidden}
          >
            <div className="searchBox">
              <i className="icon icon-search Gray_9e Font20"></i>
              <Input
                value={searchWorksheetListValue}
                onChange={value => this.setState({ searchWorksheetListValue: value })}
                placeholder={_l(
                  '%0个视图',
                  viewList.filter(l => isCharge || (_.get(l, 'advancedSetting.showhide') || '').search(/hide|hpc/g) < 0)
                    .length,
                )}
                type="text"
                className="drawerWorksheetHiddenSearch flex"
                manualRef={this.searchRef}
              />
              {!!searchWorksheetListValue && (
                <Icon
                  icon="closeelement-bg-circle"
                  className="Font16 Hand Gray_9e mRight10"
                  onClick={() => {
                    this.setState({ searchWorksheetListValue: '' });
                  }}
                />
              )}
            </div>
            {isEmpty ? (
              <EmptyData>{_l('没有搜索到相关视图')}</EmptyData>
            ) : (
              <Fragment>
                <SortHiddenListContainer
                  distance={10}
                  onSortEnd={prop => {
                    if (!isCharge) return;
                    const { newIndex, oldIndex } = prop;
                    if (newIndex === oldIndex) {
                      return;
                    }
                    let _newList = viewList.filter(l => _.get(l, 'advancedSetting.showhide') !== 'hide');
                    let _prop = {};
                    _prop.newIndex = _.findIndex(viewList, l => l.viewId === _newList[newIndex].viewId);
                    _prop.oldIndex = _.findIndex(viewList, l => l.viewId === _newList[oldIndex].viewId);
                    this.handleSortEnd(_prop);
                  }}
                  type="drawerWorksheetShowList"
                  helperClass="drawerWorksheetShowListItem"
                >
                  {viewList
                    .filter(l => _.get(l, 'advancedSetting.showhide') !== 'hide')
                    .filter(l => isCharge || !(_.get(l, 'advancedSetting.showhide') || '').includes('hpc'))
                    .filter(l => !searchWorksheetListValue || l.name.includes(_.trim(searchWorksheetListValue)))
                    .map((item, index) => (
                      <SortHiddenListItem
                        disabled={!isCharge}
                        isCharge={isCharge}
                        isLock={this.props.isLock}
                        lockAxis={'y'}
                        currentViewId={currentViewId}
                        projectId={_.get(this.props, 'worksheetInfo.projectId')}
                        item={item}
                        appId={this.props.appId}
                        key={`drawerWorksheetShowList-${item.viewId}`}
                        index={index}
                        style={{ zIndex: 999999 }}
                        type="drawerWorksheetShowList"
                        viewList={viewList}
                        controls={this.props.worksheetControls}
                        sheetSwitchPermit={sheetSwitchPermit}
                        toView={() => navigateTo(getNavigateUrl(item))}
                        onCopyView={this.handleCopyView}
                        updateAdvancedSetting={this.updateAdvancedSetting}
                        onRemoveView={this.handleRemoveView}
                        updateViewName={this.updateViewName}
                        handleSortEnd={this.handleSortEnd}
                        onOpenView={this.handleOpenView}
                        onShare={this.props.onShare}
                        onExport={this.props.onExport}
                        onExportAttachment={this.props.onExportAttachment}
                      />
                    ))}
                </SortHiddenListContainer>
                {isCharge &&
                  !!viewList
                    .filter(l => _.get(l, 'advancedSetting.showhide') === 'hide')
                    .filter(l => !searchWorksheetListValue || l.name.includes(_.trim(searchWorksheetListValue)))
                    .length && <div className="drawerWorksheetHiddenListTitle Gray_9e">{_l('隐藏的视图')}</div>}
                {isCharge && (
                  <SortHiddenListContainer
                    disabled={!isCharge}
                    distance={10}
                    onSortEnd={prop => {
                      const { newIndex, oldIndex } = prop;
                      if (newIndex === oldIndex) {
                        return;
                      }
                      let _newList = viewList.filter(l => _.get(l, 'advancedSetting.showhide') === 'hide');
                      let _prop = {};
                      _prop.newIndex = _.findIndex(viewList, l => l.viewId === _newList[newIndex].viewId);
                      _prop.oldIndex = _.findIndex(viewList, l => l.viewId === _newList[oldIndex].viewId);
                      this.handleSortEnd(_prop);
                    }}
                    type="drawerWorksheetHiddenList"
                  >
                    {viewList
                      .filter(l => _.get(l, 'advancedSetting.showhide') === 'hide')
                      .filter(l => !searchWorksheetListValue || l.name.includes(searchWorksheetListValue))
                      .map((item, index) => (
                        <SortHiddenListItem
                          disabled={!isCharge}
                          isCharge={isCharge}
                          isLock={this.props.isLock}
                          lockAxis={'y'}
                          currentViewId={currentViewId}
                          projectId={_.get(this.props, 'worksheetInfo.projectId')}
                          item={item}
                          appId={this.props.appId}
                          key={`drawerWorksheetHiddenList-${item.viewId}`}
                          index={index}
                          style={{ zIndex: 999999 }}
                          type="drawerWorksheetHiddenList"
                          viewList={viewList}
                          controls={this.props.worksheetControls}
                          sheetSwitchPermit={sheetSwitchPermit}
                          toView={() => navigateTo(getNavigateUrl(item))}
                          onCopyView={this.handleCopyView}
                          updateAdvancedSetting={this.updateAdvancedSetting}
                          onRemoveView={this.handleRemoveView}
                          updateViewName={this.updateViewName}
                          handleSortEnd={this.handleSortEnd}
                          onOpenView={this.handleOpenView}
                          onShare={this.props.onShare}
                          onExport={this.props.onExport}
                          onExportAttachment={this.props.onExportAttachment}
                        />
                      ))}
                  </SortHiddenListContainer>
                )}
              </Fragment>
            )}
          </Drawer>
        </div>
        {isCharge && !isLock && (
          <Trigger
            action={['click']}
            popupAlign={{ points: ['tl', 'bl'], offset: [-6, 4] }}
            popupVisible={addMenuVisible}
            onPopupVisibleChange={visible => this.setState({ addMenuVisible: visible })}
            popup={
              <AddViewDisplayMenu
                canAddCustomView
                projectId={_.get(this.props, 'worksheetInfo.projectId')}
                onClick={this.handleAdd}
                popupVisible={addMenuVisible}
                appId={this.props.appId}
              />
            }
          >
            <Tooltip popupPlacement="bottom" text={<span>{_l('添加视图')}</span>}>
              <Icon
                icon="add"
                className={cx('Font20 Gray_75 pointer addViewIcon mLeft8 hoverGray', { menuVisible: addMenuVisible })}
              />
            </Tooltip>
          </Trigger>
        )}
        <div
          className="valignWrapper flex workSheetViewsWrapper"
          ref={scrollWraperEl => {
            this.scrollWraperEl = scrollWraperEl;
          }}
        >
          <SortableList
            axis="x"
            lockAxis={'x'}
            disabled={!isCharge}
            helperClass="workSheetSortableViewItem"
            distance={5}
            list={viewList}
            currentViewId={currentViewId}
            currentView={_.find(viewList, { viewId: currentViewId }) || {}}
            changeViewDisplayType={changeViewDisplayType}
            onSortEnd={this.handleSortEnd}
            onRemoveView={this.handleRemoveView}
            onOpenView={this.handleOpenView}
            getNavigateUrl={this.props.getNavigateUrl}
            onCopyView={this.handleCopyView}
            onShare={this.props.onShare}
            onExport={this.props.onExport}
            onExportAttachment={this.props.onExportAttachment}
            onScroll={this.updateScrollBtnState}
            updateViewName={this.updateViewName}
            isCharge={isCharge}
            sheetSwitchPermit={sheetSwitchPermit}
            updateAdvancedSetting={this.updateAdvancedSetting}
            isLock={this.props.isLock}
            appId={this.props.appId}
            controls={this.props.worksheetControls}
            projectId={_.get(this.props, 'worksheetInfo.projectId')}
          />
        </div>
        {directionVisible ? (
          <div className="Width95">
            <Icon
              icon="arrow-left-tip"
              className={cx('Gray_9e pointer Font15', { Alpha3: hideDirection === 'left' })}
              onClick={() => this.handleScrollPosition(0)}
            />
            <Icon
              icon="arrow-right-tip"
              className={cx('Gray_9e pointer Font15', { Alpha3: hideDirection === 'right' })}
              onClick={() => this.handleScrollPosition(1)}
            />
          </div>
        ) : null}
      </div>
    );
  }
}
