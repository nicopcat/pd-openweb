import React, { Component, Fragment } from 'react';
import { ScrollView, LoadDiv, Radio, Dialog } from 'ming-ui';
import flowNode from '../../../api/flowNode';
import process from '../../../api/process';
import {
  DetailHeader,
  DetailFooter,
  TriggerCondition,
  SpecificFieldsValue,
  LoopProcessParameters,
  ProcessVariables,
} from '../components';
import { ACTION_ID } from '../../enum';
import _ from 'lodash';
import { checkConditionsIsNull } from '../../utils';

export default class LoopProcess extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: {},
      saveRequest: false,
      subProcessDialog: false,
      processVariables: [],
      errorItems: {},
    };
  }

  cacheSubProcessVariables = null;

  componentDidMount() {
    this.getNodeDetail(this.props);
  }

  componentWillReceiveProps(nextProps, nextState) {
    if (nextProps.selectNodeId !== this.props.selectNodeId) {
      this.getNodeDetail(nextProps);
    }

    if (
      nextProps.selectNodeName &&
      nextProps.selectNodeName !== this.props.selectNodeName &&
      nextProps.selectNodeId === this.props.selectNodeId &&
      !_.isEmpty(this.state.data)
    ) {
      this.updateSource({ name: nextProps.selectNodeName });
    }
  }

  /**
   * 获取节点详情
   */
  getNodeDetail(props, isGetFields = false) {
    const { processId, selectNodeId, selectNodeType, instanceId } = props;
    const { data } = this.state;

    flowNode
      .getNodeDetail({ processId, nodeId: selectNodeId, flowNodeType: selectNodeType, instanceId })
      .then(result => {
        if (result.actionId === ACTION_ID.CONDITION_LOOP && !result.conditions.length) {
          result.conditions = [[{}]];
        }

        if (isGetFields) {
          result.conditions = data.conditions;
          result.maxLoopCount = data.maxLoopCount;
          result.executeType = data.executeType;
          result.fields = result.fields.map(item => {
            return _.find(data.fields, o => o.fieldId === item.fieldId) || item;
          });
          result.subProcessVariables = result.subProcessVariables.map(item => {
            return _.find(data.subProcessVariables, o => o.controlId === item.controlId) || item;
          });
        } else {
          this.cacheSubProcessVariables = _.cloneDeep(result.subProcessVariables);
        }

        this.setState({ data: result });
      });
  }

  /**
   * 更新data数据
   */
  updateSource = (obj, callback = () => {}) => {
    this.props.haveChange(true);
    this.setState({ data: Object.assign({}, this.state.data, obj) }, callback);
  };

  /**
   * 保存
   */
  onSave = () => {
    const { data, saveRequest } = this.state;
    const { conditions, subProcessVariables } = data;

    if (saveRequest) {
      return;
    }

    if (data.actionId === ACTION_ID.CONDITION_LOOP && !conditions.length) {
      alert(_l('循环退出条件不能为空'), 2);
      return;
    }

    if (checkConditionsIsNull(conditions)) {
      alert(_l('循环退出条件的判断值不能为空'), 2);
      return;
    }

    this.saveSubProcessOptions(subProcessVariables, true);

    flowNode
      .saveNode({
        processId: this.props.processId,
        nodeId: this.props.selectNodeId,
        flowNodeType: this.props.selectNodeType,
        ...data,
      })
      .then(result => {
        this.props.updateNodeData(result);
        this.props.closeDetail();
      });

    this.setState({ saveRequest: true });
  };

  /**
   * 渲染内容
   */
  renderContent() {
    const { data, subProcessDialog, processVariables, errorItems } = this.state;
    const END_LIST = [
      { text: _l('跳出并进入下一次循环'), value: 1 },
      { text: _l('跳出并终止循环，继续后面的流程'), value: 2 },
      { text: _l('中止流程'), value: 0 },
    ];

    return (
      <Fragment>
        <div className="Font13 mTop20 bold">{_l('参数设置')}</div>
        <div className="Font13 mTop5 Gray_75">
          {data.actionId === ACTION_ID.CONDITION_LOOP
            ? _l('定义循环中使用的参数，每次循环可以使用前一次循环中更新的参数值。“index”参数每次循环后自动加1。')
            : _l(
                '定义循环中使用的参数，每次循环可以使用前一次循环中更新的参数值。“start”参数每次循环自动增加“step”的值。',
              )}
        </div>
        <LoopProcessParameters
          {...this.props}
          data={data}
          updateSource={this.updateSource}
          onDelete={this.saveSubProcessOptions}
        />

        <div className="addActionBtn mTop15">
          <span
            className="ThemeBorderColor3"
            onClick={() => this.setState({ subProcessDialog: true, processVariables: data.subProcessVariables })}
          >
            <i className="icon-add Font16" />
            {_l('新参数')}
          </span>
        </div>

        <div className="Font13 mTop20 bold">{_l('循环退出条件')}</div>
        <div className="Font13 mTop5 Gray_75">
          {data.actionId === ACTION_ID.CONDITION_LOOP
            ? _l('参数满足下面条件时退出循环，请在循环中更新参数值以触发条件')
            : _l('当“start”参数值大于“end”参数值时，退出循环')}
        </div>

        {data.actionId === ACTION_ID.CONDITION_LOOP && (
          <Fragment>
            {!data.conditions.length ? (
              this.renderConditionBtn()
            ) : (
              <TriggerCondition
                projectId={this.props.companyId}
                processId={this.props.processId}
                relationId={this.props.relationId}
                selectNodeId={this.props.selectNodeId}
                controls={data.subProcessVariables}
                data={data.conditions}
                updateSource={data => this.updateSource({ conditions: data })}
                allowEmptyIgnore={false}
              />
            )}
          </Fragment>
        )}

        <div className="Font13 mTop20 bold">{_l('最大循环次数')}</div>
        <div className="mTop10">
          <SpecificFieldsValue
            type="number"
            hasOtherField={false}
            min={1}
            max={10000}
            allowedEmpty
            data={{ fieldValue: data.maxLoopCount }}
            updateSource={({ fieldValue }) => this.updateSource({ maxLoopCount: fieldValue })}
          />
        </div>
        <div className="Font13 mTop10 Gray_75">
          {_l('值范围为1~10000。为避免影响性能或超时，到达最大循环次数时将自动终止循环并进入后续流程。')}
        </div>

        <div className="Font13 mTop20 bold">{_l('循环中流程中止时')}</div>
        {END_LIST.map(item => (
          <div className="mTop10" key={item.value}>
            <Radio
              text={item.text}
              checked={data.executeType === item.value}
              onClick={() => this.updateSource({ executeType: item.value })}
            />
          </div>
        ))}

        {subProcessDialog && (
          <Dialog
            visible
            className="subProcessDialog"
            onCancel={() => this.setState({ subProcessDialog: false })}
            onOk={() => this.saveSubProcessOptions(processVariables)}
            title={_l('参数设置')}
          >
            <ProcessVariables
              processVariables={processVariables}
              errorItems={errorItems}
              setErrorItems={errorItems => this.setState({ errorItems })}
              updateSource={processVariables => this.setState(processVariables)}
            />
          </Dialog>
        )}
      </Fragment>
    );
  }

  /**
   * 渲染筛选条件按钮
   */
  renderConditionBtn() {
    const { data } = this.state;

    return (
      <div className="addActionBtn mTop15">
        <span
          className={data.appId ? 'ThemeBorderColor3' : 'Gray_bd borderColor_c'}
          onClick={() => this.updateSource({ conditions: [[{}]] })}
        >
          <i className="icon-add Font16" />
          {_l('筛选条件')}
        </span>
      </div>
    );
  }

  /**
   * 保存子流程参数
   */
  saveSubProcessOptions = (processVariables, exist = false) => {
    const { data, errorItems } = this.state;

    if (_.isEqual(this.cacheSubProcessVariables, processVariables)) return;

    if (_.find(errorItems, o => o)) {
      alert(_l('有参数配置错误'), 2);
      return;
    }

    if (processVariables.filter(item => !item.controlName).length) {
      alert(_l('参数名称不能为空'), 2);
      return;
    }

    process
      .saveProcessConfig({
        processId: data.subProcessId,
        isSaveVariables: true,
        processVariables,
      })
      .then(result => {
        if (result && !exist) {
          this.setState({ subProcessDialog: false });
          this.getNodeDetail(this.props, true);
        }
      });
  };

  render() {
    const { data } = this.state;

    if (_.isEmpty(data)) {
      return <LoadDiv className="mTop15" />;
    }

    return (
      <Fragment>
        <DetailHeader
          {...this.props}
          data={{ ...data }}
          icon="icon-arrow_loop"
          bg="BGBlueAsh"
          removeNodeName
          updateSource={this.updateSource}
        />
        <div className="flex">
          <ScrollView>
            <div className="flowDetailStartHeader flexColumn BGBlueAsh" style={{ height: 245 }}>
              <div className="flowDetailStartIcon flexRow" style={{ background: 'rgba(0, 0, 0, 0.24)' }}>
                <i className="icon-arrow_loop Font40 white" />
              </div>
              <div className="Font16 mTop10">
                {data.actionId === ACTION_ID.CONDITION_LOOP ? _l('满足条件时循环') : _l('循环指定次数')}
              </div>
              <div className="Font14 mTop10">
                {data.actionId === ACTION_ID.CONDITION_LOOP
                  ? _l('一直循环运行一段流程，并在参数达到退出条件后结束')
                  : _l('按指定的起始值、结束值和步长值循环固定次数')}
              </div>
            </div>
            <div className="workflowDetailBox">{this.renderContent()}</div>
          </ScrollView>
        </div>
        <DetailFooter {...this.props} isCorrect onSave={this.onSave} />
      </Fragment>
    );
  }
}
