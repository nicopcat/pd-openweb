import React from 'react';
import PropTypes from 'prop-types';
import ChildTable from 'worksheet/components/ChildTable';
import RecordInfoContext from 'worksheet/common/recordInfo/RecordInfoContext';
import autobind from 'core-decorators/lib/autobind';
import { browserIsMobile } from 'src/util';
import _ from 'lodash';
import { ADD_EVENT_ENUM } from 'src/pages/widgetConfig/widgetSetting/components/CustomEvent/config.js';

export default class SubList extends React.Component {
  static contextType = RecordInfoContext;
  static propTypes = {
    from: PropTypes.number,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.shape({})]),
    worksheetId: PropTypes.string,
    recordId: PropTypes.string,
    dataSource: PropTypes.string,
    formData: PropTypes.arrayOf(PropTypes.shape({})),
    registerCell: PropTypes.func,
    onChange: PropTypes.func,
  };

  childTable = React.createRef();

  constructor(props) {
    super(props);
    this.debounceChange = _.debounce(this.props.onChange, 500);
  }

  componentDidMount() {
    if (_.isFunction(this.props.triggerCustomEvent)) {
      this.props.triggerCustomEvent(ADD_EVENT_ENUM.SHOW);
    }
  }

  @autobind
  handleChange({ rows, originRows = [], lastAction = {} }, mode) {
    if (mode === 'childTableDialog') {
      if (!this.childTable.current) return;

      this.childTable.current.store.dispatch({
        type: 'FORCE_SET_OUT_ROWS',
        rows,
      });
    }
    const { value, recordId, from, controlId, loadDraftChildTableData = () => {} } = this.props;
    const onChange =
      lastAction.type === 'UPDATE_ROW' && lastAction.asyncUpdate ? this.debounceChange : this.props.onChange;
    const isAdd = !recordId;
    if (
      !_.includes(
        [
          'INIT_ROWS',
          'LOAD_ROWS',
          'UPDATE_BASE_LOADING',
          'UPDATE_BASE',
          'UPDATE_CELL_ERRORS',
          'FORCE_SET_OUT_ROWS',
          'RESET',
        ],
        lastAction.type,
      ) &&
      !/^@/.test(lastAction.type)
    ) {
      if (isAdd) {
        onChange({
          isAdd: true,
          rows: rows.filter(row => !row.empty),
        });
      } else if (lastAction.type === 'CLEAR_AND_SET_ROWS') {
        onChange({
          deleted: originRows.map(r => r.rowid),
          updated: rows.map(r => r.rowid),
          rows: rows,
        });
      } else {
        let deleted = [];
        let updated = [];
        try {
          deleted = value.deleted || lastAction.deleted || [];
          updated = value.updated || lastAction.updated || [];
        } catch (err) {}
        if (lastAction.type === 'DELETE_ROW') {
          deleted = _.uniqBy(deleted.concat(lastAction.rowid)).filter(id => !/^(temp|default)/.test(id));
        } else if (lastAction.type === 'DELETE_ROWS') {
          deleted = _.uniqBy(deleted.concat(lastAction.rowIds)).filter(id => !/^(temp|default)/.test(id));
        } else if (lastAction.type === 'ADD_ROW' || lastAction.type === 'UPDATE_ROW') {
          updated = _.uniqBy(updated.concat(lastAction.rowid));
        } else if (lastAction.type === 'ADD_ROWS') {
          updated = _.uniqBy(updated.concat(lastAction.rows.map(r => r.rowid)));
        }
        onChange({
          deleted,
          updated,
          rows: rows,
        });
      }
    }

    if (from === 21 && lastAction.type === 'INIT_ROWS') {
      loadDraftChildTableData(controlId);
    }
  }

  componentWillUnmount() {
    if (_.isFunction(this.props.triggerCustomEvent)) {
      this.props.triggerCustomEvent(ADD_EVENT_ENUM.HIDE);
    }
  }

  render() {
    const {
      from,
      registerCell,
      worksheetId,
      recordId,
      formData,
      disabled,
      appId,
      initSource,
      viewIdForPermit,
      sheetSwitchPermit,
      flag,
    } = this.props;
    const control = { ...this.props };
    return (
      <div className="mdsubList" style={{ minHeight: 74, margin: '2px 0 12px' }}>
        {
          <ChildTable
            showSearch
            showExport
            ref={this.childTable}
            initSource={initSource}
            registerCell={registerCell}
            appId={appId}
            viewId={viewIdForPermit}
            from={from}
            control={control}
            recordId={recordId}
            sheetSwitchPermit={sheetSwitchPermit}
            flag={flag}
            masterData={{
              worksheetId,
              formData: formData
                .map(c => _.pick(c, ['controlId', 'type', 'value', 'options', 'attribute', 'enumDefault']))
                .filter(c => !!c.value),
            }}
            onChange={this.handleChange}
            mobileIsEdit={browserIsMobile() ? !disabled : undefined}
          />
        }
      </div>
    );
  }
}
