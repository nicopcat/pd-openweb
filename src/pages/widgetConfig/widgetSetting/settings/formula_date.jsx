import React, { useRef, useState, Fragment, useEffect } from 'react';
import { Dropdown, TagTextarea } from 'ming-ui';
import { Tooltip } from 'antd';
import InputSuffix from '../components/formula/InputSuffix';
import SwitchType from '../components/formula/SwitchType';
import ToTodaySetting from '../components/formula/toTodaySetting';
import DynamicSelectDateControl from '../components/DynamicSelectDateControl';
import SelectControl from '../components/SelectControl';
import PreSuffix from '../components/PreSuffix';
import PointerConfig from '../components/PointerConfig';
import { SettingItem, ControlTag } from '../../styled';
import { getAdvanceSetting, getControlByControlId } from '../../util';
import { getFormulaControls } from '../../util/data';
import { parseDataSource, handleAdvancedSettingChange } from '../../util/setting';

import _ from 'lodash';

const CALC_TYPE = [
  {
    text: _l('时长'),
    value: 1,
  },
  {
    text: _l('为日期加减时间'),
    value: 2,
  },
  { text: _l('距离此刻的时长'), value: 3 },
];

const FORMAT_TYPE = [
  { text: _l('开始日期 00:00，结束日期 24:00'), value: '1' },
  { text: _l('开始日期 00:00，结束日期 00:00'), value: '0' },
];

export default function FormulaDate(props) {
  const { allControls, data, onChange, ...rest } = props;
  const { strDefault, enumDefault, unit } = data;
  const { autocarry = '0' } = getAdvanceSetting(data);
  const sourceControlId = parseDataSource(data.sourceControlId);
  const dataSource = parseDataSource(data.dataSource);
  const [selectControlVisible, setVisible] = useState(false);
  const $ref = useRef(null);
  const getCalcDetail = () => {
    if (enumDefault === 1) {
      return (
        <Fragment>
          <SettingItem>
            <div className="settingItemTitle">{_l('开始')}</div>
            <DynamicSelectDateControl
              {...props}
              value={sourceControlId}
              onChange={value => onChange({ sourceControlId: value })}
            />
          </SettingItem>
          <SettingItem>
            <div className="settingItemTitle">{_l('结束')}</div>
            <DynamicSelectDateControl
              {...props}
              value={dataSource}
              onChange={value => onChange({ dataSource: value })}
            />
          </SettingItem>
          <SettingItem>
            <div className="settingItemTitle">{_l('格式化')}</div>
            <div className="subTitle Font12 Gray_9e">{_l('参与计算的日期未设置时间时，格式化方式为: ')}</div>
            <Dropdown
              border
              value={strDefault}
              data={FORMAT_TYPE}
              onChange={value => onChange({ strDefault: value })}
            />
          </SettingItem>
          <InputSuffix data={data} onChange={onChange} />
          {autocarry !== '1' && (
            <SettingItem>
              <div className="settingItemTitle">{_l('单位')}</div>
              <PreSuffix data={data} onChange={onChange} />
            </SettingItem>
          )}
          <PointerConfig
            data={data}
            onChange={value => {
              if (value.advancedSetting) {
                onChange(value);
              } else {
                let newVal = value || {};
                if (!Number(value.dot)) {
                  newVal.dotformat = '0';
                }
                onChange({ ...handleAdvancedSettingChange(data, newVal), ...value });
              }
            }}
          />
        </Fragment>
      );
    }
    if (enumDefault === 2) {
      return (
        <Fragment>
          <SettingItem>
            <div className="settingItemTitle">{_l('选择日期')}</div>
            <DynamicSelectDateControl
              {...props}
              disableTimeControl={true}
              value={sourceControlId}
              onChange={value => onChange({ sourceControlId: value })}
            />
          </SettingItem>
          <SettingItem>
            <div className="settingItemTitle">{_l('计算')}</div>
            <p className="Font12 Gray_9e">
              {_l('输入你想要 添加/减去 的时间。如：+8h+1m，-1d+8h。当使用数值类型的字段运算时，请不要忘记输入单位。')}
              <Tooltip
                title={
                  <Fragment>
                    <div>{_l('年：Y（大写)')}</div>
                    <div>{_l('月：M（大写)')}</div>
                    <div>{_l('天：d')}</div>
                    <div>{_l('小时：h')}</div>
                    <div>{_l('分：m')}</div>
                  </Fragment>
                }
              >
                <span className="pointer" style={{ color: '#2196f3' }}>
                  {_l('查看时间单位')}
                </span>
              </Tooltip>
            </p>
            <TagTextarea
              rightIcon
              mode={4}
              defaultValue={data.dataSource}
              maxHeight={140}
              getRef={tagtextarea => {
                $ref.current = tagtextarea;
              }}
              renderTag={(id, options) => {
                return <ControlTag>{getControlByControlId(allControls, id).controlName}</ControlTag>;
              }}
              onAddClick={() => setVisible(true)}
              onChange={(err, value, obj) => {
                if (err) {
                  return;
                }
                onChange({ dataSource: value });
              }}
              onFocus={() => {
                setVisible(true);
              }}
            />
            {selectControlVisible && (
              <SelectControl
                searchable={false}
                className={'isolate'}
                list={getFormulaControls(allControls, data)}
                onClickAway={() => setVisible(false)}
                onClick={item => {
                  $ref.current.insertColumnTag(item.controlId);
                  setVisible(false);
                }}
              />
            )}
          </SettingItem>
          <SettingItem>
            <div className="settingItemTitle">{_l('输出格式')}</div>
            <Dropdown
              border
              value={unit || '3'}
              data={[
                { text: _l('日期+时间'), value: '1' },
                { text: _l('日期'), value: '3' },
                { text: _l('时分'), value: '8' },
                { text: _l('时分秒'), value: '9' },
              ]}
              onChange={value => onChange({ unit: value })}
            />
          </SettingItem>
        </Fragment>
      );
    }
    if (enumDefault === 3) {
      return <ToTodaySetting {...props} />;
    }
  };
  useEffect(() => {
    if ($ref.current) {
      $ref.current.setValue(data.dataSource || '');
    }
    // 为日期加减时间没有小数配置
    if (enumDefault === 2) {
      onChange(handleAdvancedSettingChange({ ...data, dot: 0 }, { dot: '0' }));
    }
  }, [data.controlId, enumDefault]);
  return (
    <Fragment>
      <SwitchType {...props} />
      <SettingItem>
        <div className="settingItemTitle">{_l('计算方式')}</div>
        <Dropdown
          border
          value={enumDefault}
          data={CALC_TYPE}
          onChange={value => {
            if (value === enumDefault) return;
            if (value === 3) {
              onChange({ enumDefault: value, dataSource: '', sourceControlId: '', unit: '3' });
              return;
            }
            onChange({
              enumDefault: value,
              dataSource: '',
              sourceControlId: '',
              unit: value === 2 && !_.includes(['1', '3', '8', '9'], unit) ? '3' : unit,
            });
          }}
        />
      </SettingItem>
      {getCalcDetail()}
    </Fragment>
  );
}
