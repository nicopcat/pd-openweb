import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as actions from 'worksheet/redux/actions/gunterview';
import cx from 'classnames';
import styled from 'styled-components';
import DragMask from 'worksheet/common/DragMask';
import GunterDirectory from './Directory';
import GunterChart from './Chart';
import { browserIsMobile } from 'src/util';
import SelectionIndicator from './components/SelectionIndicator';
import { PERIOD_TYPE } from 'src/pages/worksheet/views/GunterView/config';
import './index.less';
import _ from 'lodash';

const Drag = styled.div(
  ({ left }) => `
  position: absolute;
  z-index: 2;
  left: ${left}px;
  width: 2px;
  height: 100%;
  cursor: ew-resize;
  &:hover {
    border-left: 1px solid #ddd;
  }
`,
);

const isGunterExport = location.href.includes('gunterExport');

@connect(
  state => ({ ..._.pick(state.sheet.gunterView, ['loading', 'groupingVisible', 'chartScroll', 'groupingScroll']) }),
  dispatch => bindActionCreators(actions, dispatch),
)
export default class Gunter extends Component {
  constructor(props) {
    super(props);
    const { view } = props;
    this.state = {
      directoryWidth: this.getDirectoryWidth(view.viewId),
      dragMaskVisible: false,
      maxWidth: 0,
    };
  }
  componentDidMount() {
    const { view, updateViewConfig, noLoadAtDidMount } = this.props;
    const { calendartype } = view.advancedSetting;

    updateViewConfig();

    if (isGunterExport) {
      this.props.fetchRows();
    } else {
      const gunterViewType = localStorage.getItem('gunterViewType');
      this.props.updataPeriodType(
        gunterViewType ? Number(gunterViewType) : calendartype ? Number(calendartype) : PERIOD_TYPE.day,
      );
      if (!noLoadAtDidMount) {
        this.props.fetchRows();
      }
    }

    const viewEl = document.querySelector(`.gunterView-${view.viewId}`);
    this.setState({
      maxWidth: viewEl ? (60 / 100) * viewEl.offsetWidth : 0,
    });
  }
  componentWillUnmount() {
    this.props.destroyGunterView();
  }
  componentWillReceiveProps({ view }) {
    if (
      view.viewId !== this.props.view.viewId ||
      view.advancedSetting.navshow !== this.props.view.advancedSetting.navshow || //显示项设置 更新数据
      view.advancedSetting.navfilters !== this.props.view.advancedSetting.navfilters ||
      view.moreSort !== this.props.view.moreSort // 排序
    ) {
      this.props.resetLoadGunterView();
      this.setState({
        directoryWidth: this.getDirectoryWidth(view.viewId),
      });
    }
    if (view.advancedSetting.calendartype !== this.props.view.advancedSetting.calendartype) {
      const type = view.advancedSetting.calendartype ? Number(view.advancedSetting.calendartype) : PERIOD_TYPE.day;
      this.props.changeViewType(type);
    }
    if (view.advancedSetting.unweekday !== this.props.view.advancedSetting.unweekday) {
      this.props.updateViewConfig();
      this.props.refreshGunterView();
    }
    if (view.advancedSetting.colorid !== this.props.view.advancedSetting.colorid) {
      this.props.updateViewConfig();
      this.props.updateRecordTimeBlockColor();
    }
    if (view.advancedSetting.clicktype !== this.props.view.advancedSetting.clicktype) {
      this.props.updateViewConfig();
    }
    if (
      view.viewControl !== this.props.view.viewControl ||
      view.advancedSetting.milepost !== this.props.view.advancedSetting.milepost ||
      view.advancedSetting.begindate !== this.props.view.advancedSetting.begindate ||
      view.advancedSetting.enddate !== this.props.view.advancedSetting.enddate
    ) {
      this.props.updateViewConfig();
      this.props.fetchRows();
    }
    if (!_.isEqual(view.displayControls, this.props.view.displayControls)) {
      // 等待 Worksheet/SaveWorksheetView 接口更新 displayControls 后再重新请求
      setTimeout(() => {
        this.props.updateViewConfig();
        this.props.fetchRows();
      }, 200);
    }
  }
  getDirectoryWidth(viewId) {
    const gunterDirectoryWidth = localStorage.getItem(`gunterDirectoryWidth-${viewId}`);
    const worksheetContentBoxEl = document.querySelector('.worksheetSheet');
    const contentBoxWidth = worksheetContentBoxEl ? worksheetContentBoxEl.clientWidth / 3 : 210;
    return isGunterExport ? 570 : gunterDirectoryWidth ? Number(gunterDirectoryWidth) : contentBoxWidth;
  }
  render() {
    const { view, loading, groupingVisible, layoutType } = this.props;
    const { directoryWidth, dragMaskVisible, maxWidth } = this.state;
    const isMobile = browserIsMobile() || layoutType === 'mobile';

    return (
      <div className={cx('gunterView flexRow', `gunterView-${view.viewId}`, { gunterViewLoading: loading })}>
        {groupingVisible && !isMobile && (
          <Fragment>
            {dragMaskVisible && (
              <DragMask
                value={directoryWidth}
                min={210}
                max={maxWidth}
                onChange={value => {
                  const { chartScroll, groupingScroll } = this.props;
                  this.setState({ dragMaskVisible: false, directoryWidth: value });
                  safeLocalStorageSetItem(`gunterDirectoryWidth-${view.viewId}`, value);
                  chartScroll.refresh();
                  chartScroll._execEvent('scroll');
                  groupingScroll.refresh();
                  groupingScroll._execEvent('scroll');
                }}
              />
            )}
            <GunterDirectory width={directoryWidth} />
            <Drag left={directoryWidth} onMouseDown={() => this.setState({ dragMaskVisible: true })} />
          </Fragment>
        )}
        <GunterChart isMobile={isMobile} />
        {!loading && !isMobile && <SelectionIndicator />}
      </div>
    );
  }
}
