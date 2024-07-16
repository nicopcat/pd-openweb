import React from 'react';
import styled from 'styled-components';
import { Dropdown, Icon, Tooltip } from 'ming-ui';
import { filterAndFormatterControls } from 'src/pages/worksheet/views/util';
import { FlexCenter } from 'worksheet/styled';
import { getIconByType } from 'src/pages/widgetConfig/util';
import _ from 'lodash';
import cx from 'classnames';
import { SwitchStyle } from '../style';

const Wrap = styled.div`
  border-radius: 3px;
  width: fit-content;
  span {
    display: inline-block;
    padding: 0 24px;
    height: 36px;
    line-height: 36px;
    border: 1px solid #e0e0e0;
    &:nth-child(1),
    &:nth-child(2) {
      border-right: none;
    }
    &:nth-child(1) {
      border-radius: 3px 0 0 3px;
    }
    &:last-child {
      border-radius: 0 3px 3px 0;
    }
    &.current {
      background: #2196f3;
      color: #fff !important;
      border-color: #2196f3;
    }
    &:hover {
      color: #2196f3;
    }
  }
`;
const MapSettingWrap = styled.div`
  .splitLine {
    border-bottom: 1px solid #eaeaea;
    width: 100%;
    height: 1px;
  }
  .allColorSelectFields {
    font-weight: 500;
    border-radius: 4px;

    .Dropdown--border {
      // border: 1px solid rgba(33, 150, 243, 0.3);
    }

    .Item-content {
      padding-left: 32px !important;
    }
  }
`;

const DisplayControlOption = styled(FlexCenter)`
  .icon {
    font-size: 16px;
    color: rgba(0, 0, 0, 0.4);
    margin-right: 4px;
  }
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-left: 4px;
  }
`;

const SelectValue = styled(DisplayControlOption)`
  &：hover {
    .icon {
      color: #2196f3;
    }
  }
`;

export default function MapSetting(props) {
  const { view, columns, updateCurrentView, appId } = props;
  const { advancedSetting, viewControl } = view;
  const tagColorControl = _.find(columns, { controlId: _.get(view, 'advancedSetting.tagcolorid') });
  const updateViewTagType = value => {
    updateCurrentView({
      ...view,
      appId,
      advancedSetting: { tagType: value },
      editAttrs: ['advancedSetting'],
      editAdKeys: ['tagType'],
    });
  };
  const getViewSelectFields = () => {
    return filterAndFormatterControls({
      controls: columns,
      filter: l => l.type === 40 || (l.type === 30 && l.sourceControlType === 40),
      formatter: ({ controlName, controlId, type }) => ({
        text: controlName,
        value: controlId,
        icon: getIconByType(type, false),
      }),
    });
  };

  return (
    <MapSettingWrap className="mapSettingBox">
      <div className="title bold mBottom10">{_l('位置字段')}</div>
      <div className="settingContent">
        <Dropdown
          data={getViewSelectFields()}
          value={viewControl}
          className="dropdownSelectFields"
          hoverTheme
          renderTitle={obj => {
            const { icon, text } = obj || {};
            return (
              <SelectValue>
                <Icon icon={icon} />
                <span>{text}</span>
              </SelectValue>
            );
          }}
          onChange={value => {
            if (viewControl === value) {
              return;
            }
            updateCurrentView({
              ...view,
              appId,
              viewControl: value,
              editAttrs: ['viewControl'],
            });
          }}
          border
          style={{ width: '100%' }}
          placeholder={_l('请选择')}
        />
      </div>
      <div className="mBottom32 mTop32">
        <div className="title bold mBottom8">{_l('位置标签')}</div>
        <div className="Gray_75 mTop8">{_l('在地图上显示位置名称（使用记录标题）')}</div>
        <div className="configSwitch mTop10">
          <SwitchStyle className="flexRow alignItemsCenter">
            <Icon
              icon={advancedSetting.showtitle !== '0' ? 'ic_toggle_on' : 'ic_toggle_off'}
              className="Font28 Hand"
              onClick={() => {
                updateCurrentView({
                  ...view,
                  appId,
                  advancedSetting: { showtitle: advancedSetting.showtitle !== '0' ? '0' : '' },
                  editAttrs: ['advancedSetting'],
                  editAdKeys: ['showtitle'],
                });
              }}
            />
            <div className="switchText InlineBlock Normal mLeft10 TxtMiddle">{_l('显示')}</div>
          </SwitchStyle>
        </div>
        <div className="title bold mBottom8 mTop24">{_l('标签颜色')}</div>
        <Wrap className="tagColorWrap">
          <span
            className={cx('Hand', { current: Number(advancedSetting.tagType || 0) === 0 })}
            onClick={() => updateViewTagType(0)}
          >
            {_l('浅色')}
          </span>
          <span
            className={cx('Hand', { current: Number(advancedSetting.tagType || 0) === 1 })}
            onClick={() => updateViewTagType(1)}
          >
            {_l('深色')}
          </span>
          <span
            className={cx('Hand', { current: Number(advancedSetting.tagType || 0) === 2 })}
            onClick={() => updateViewTagType(2)}
          >
            {_l('动态颜色')}
          </span>
        </Wrap>
        {Number(advancedSetting.tagType || 0) === 2 && (
          <React.Fragment>
            <div className="title Bold mTop24">
              {_l('动态颜色')}
              {tagColorControl && tagColorControl.enumDefault2 !== 1 && (
                <Tooltip className="mLeft6" text={_l('当前选择的字段未启用颜色')}>
                  <i className="icon icon-error1 Font16" style={{ color: '#ff9300' }}></i>
                </Tooltip>
              )}
            </div>
            <div className="mTop6 mBottom10 Font12 Gray_75">
              {_l('选择一个单选字段，标签将按照此字段中的选项颜色来显示')}
            </div>
            <Dropdown
              data={filterAndFormatterControls({
                controls: columns,
                filter: l => l.type === 11,
                formatter: ({ controlName, controlId, type }) => ({
                  text: controlName,
                  value: controlId,
                  icon: getIconByType(type, false),
                }),
              })}
              value={advancedSetting.tagcolorid}
              className="allColorSelectFields"
              renderTitle={obj => {
                const { icon, text } = obj || {};
                return (
                  <SelectValue>
                    <Icon icon={icon} />
                    <span>{text}</span>
                  </SelectValue>
                );
              }}
              onChange={value => {
                updateCurrentView({
                  ...view,
                  appId,
                  advancedSetting: { tagcolorid: value },
                  editAttrs: ['advancedSetting'],
                  editAdKeys: ['tagcolorid'],
                });
              }}
              border
              style={{ width: '100%' }}
              placeholder={_l('请选择')}
            />
          </React.Fragment>
        )}
      </div>
    </MapSettingWrap>
  );
}
