import React from 'react';
import PropTypes from 'prop-types';
import { autobind } from 'core-decorators';
import Trigger from 'rc-trigger';
import cx from 'classnames';
import UserHead from 'src/components/userHead';
import quickSelectUser from 'ming-ui/functions/quickSelectUser';
import { dealUserRange } from 'src/components/newCustomFields/tools/utils';
import withClickAway from 'ming-ui/decorators/withClickAway';
import createDecoratedComponent from 'ming-ui/decorators/createDecoratedComponent';
import { isKeyBoardInputChar } from 'worksheet/util';
const ClickAwayable = createDecoratedComponent(withClickAway);
import EditableCellCon from '../EditableCellCon';
import { getTabTypeBySelectUser } from 'src/pages/worksheet/common/WorkSheetFilter/util';
import _ from 'lodash';
import CellErrorTip from './comps/CellErrorTip';

// enumDefault 单选 0 多选 1
export default class User extends React.Component {
  static propTypes = {
    className: PropTypes.string,
    singleLine: PropTypes.bool,
    style: PropTypes.shape({}),
    rowHeight: PropTypes.number,
    editable: PropTypes.bool,
    disabled: PropTypes.bool, // 地图视图不使用Trigger
    isediting: PropTypes.bool,
    updateCell: PropTypes.func,
    popupContainer: PropTypes.any,
    cell: PropTypes.shape({ value: PropTypes.string }),
    projectId: PropTypes.string,
    updateEditingStatus: PropTypes.func,
    onClick: PropTypes.func,
  };
  constructor(props) {
    super(props);
    this.state = {
      value: safeParse(props.cell.value, 'array'),
    };
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.cell.value !== this.props.cell.value) {
      this.setState({ value: safeParse(nextProps.cell.value, 'array') });
    }
    const single = nextProps.cell.enumDefault === 0;
    if (this.cell.current && single && !this.props.isediting && nextProps.isediting) {
      this.pickUser();
    }
    if (!single && !this.props.isediting && nextProps.isediting && _.isEmpty(this.props.cell.value)) {
      setTimeout(() => {
        this.pickUser();
      }, 200);
    }
  }

  cell = React.createRef();

  renderCellUser(user, index) {
    const { isediting, projectId, appId, cell, disabled } = this.props;
    const { value } = this.state;

    return (
      <div className="cellUser" key={index}>
        <div className="flexRow">
          <UserHead
            className="cellUserHead"
            projectId={projectId}
            user={{
              userHead: user.avatarSmall || user.avatar,
              accountId: user.accountId,
            }}
            size={21}
            appId={cell.dataSource ? undefined : appId}
            disabled={disabled}
          />
          <span className="userName flex ellipsis">{user.fullname || user.name}</span>
          {isediting && !(cell.required && value.length === 1) && (
            <i
              className="Font14 Gray_9e icon-close Hand mLeft4"
              onClick={e => {
                e.stopPropagation();
                this.deleteUser(user.accountId);
              }}
            ></i>
          )}
        </div>
      </div>
    );
  }
  @autobind
  handleExitEditing({ exit = true } = {}) {
    const { updateEditingStatus, cell } = this.props;
    const { isError } = this.state;
    if (isError) {
      this.setState({ value: safeParse(cell.value, 'array') });
    }
    this.setState({ isError: false });
    if (exit) {
      updateEditingStatus(false);
    }
  }
  @autobind
  handleTableKeyDown(e) {
    const { editable, updateEditingStatus } = this.props;
    if (!editable) {
      return;
    }
    switch (e.key) {
      case 'Escape':
        this.handleExitEditing();
        break;
      case 'Backspace':
        this.deleteLastUser(false);
        break;
      case 'Enter':
        if (!this.isPicking) {
          this.pickUser();
        }
        break;
      default:
        if (!e.key || !isKeyBoardInputChar(e.key)) {
          return;
        }
        updateEditingStatus(true);
        if (!(e.target.tagName.toLowerCase() === 'input' && e.target.className === 'searchInput')) {
          e.stopPropagation();
          e.preventDefault();
        }
        break;
    }
  }
  @autobind
  handleChange(forceUpdate) {
    const { isSubList, cell, updateCell, updateEditingStatus } = this.props;
    const { value } = this.state;
    if (isSubList && !forceUpdate) {
      return;
    }
    if (cell.controlId === 'ownerid') {
      updateCell({
        value: value[0] && value[0].accountId,
      });
      return;
    }
    this.handleExitEditing({ exit: cell.enumDefault === 0 });
    updateCell({
      value: JSON.stringify(value),
    });
  }
  @autobind
  pickUser(event) {
    const { isSubList, worksheetId, cell, projectId, updateEditingStatus, appId, rowFormData, onValidate } = this.props;
    const { value } = this.state;
    const target = (this.cell && this.cell.current) || (event || {}).target;
    const tabType = getTabTypeBySelectUser(cell);
    if (!target || this.isPicking) {
      return;
    }
    this.isPicking = true;
    if (
      tabType === 1 &&
      md.global.Account.isPortal &&
      !_.find(md.global.Account.projects, item => item.projectId === projectId)
    ) {
      alert(_l('您不是该组织成员，无法获取其成员列表，请联系组织管理员'), 3);
      return;
    }
    const filterAccountIds = value.map(item => item.accountId);
    const callback = (data, forceUpdate) => {
      if (cell.enumDefault === 0) {
        // 单选
        if (!onValidate(JSON.stringify(data))) {
          this.setState({
            value: data,
            isError: true,
          });
          return;
        }
        this.setState(
          {
            value: data,
            valueChanged: true,
          },
          () => {
            this.handleChange(true);
          },
        );
      } else {
        let newData = [];
        try {
          newData = _.uniqBy(this.state.value.concat(data), 'accountId');
        } catch (err) {}
        this.setState(
          {
            value: newData,
            valueChanged: true,
          },
          () => this.handleChange(forceUpdate),
        );
      }
      this.isPicking = false;
    };
    const selectRangeOptions = dealUserRange(cell, _.isFunction(rowFormData) ? rowFormData() : rowFormData);
    const hasUserRange = Object.values(selectRangeOptions).some(i => !_.isEmpty(i));
    quickSelectUser(target, {
      selectRangeOptions,
      tabType,
      appId,
      showMoreInvite: false,
      prefixAccounts:
        !_.includes(filterAccountIds, md.global.Account.accountId) && !hasUserRange
          ? [
              {
                accountId: md.global.Account.accountId,
                fullname: md.global.Account.fullname,
                avatar: md.global.Account.avatar,
              },
            ]
          : [],
      filterAccountIds,
      zIndex: 10001,
      isDynamic: cell.enumDefault === 1,
      SelectUserSettings: {
        unique: cell.enumDefault === 0,
        projectId: projectId,
        filterAccountIds,
        callback: selected => callback(selected, true),
      },
      selectCb: callback,
      onClose: () => {
        this.isPicking = false;
        if (isSubList && this.state.valueChanged) {
          this.handleChange(true);
        }
      },
    });
  }

  @autobind
  handleMutipleEdit() {
    const { updateEditingStatus } = this.props;
    updateEditingStatus(true);
  }

  @autobind
  handleSingleEdit(event) {
    const { updateEditingStatus } = this.props;
    updateEditingStatus(true);
    this.pickUser(event);
  }

  @autobind
  deleteUser(accountId) {
    const { value } = this.state;
    this.setState(
      {
        value: value.filter(account => account.accountId !== accountId),
      },
      () => this.handleChange(true),
    );
  }

  @autobind
  deleteLastUser() {
    const { value } = this.state;
    if (value.length) {
      this.setState(
        {
          value: value.slice(0, -1),
        },
        this.handleChange,
      );
    }
  }

  render() {
    const {
      className,
      error,
      rowIndex,
      singleLine,
      style,
      rowHeight,
      popupContainer,
      cell,
      editable,
      isediting,
      updateEditingStatus,
      disabled,
    } = this.props;
    const { value } = this.state;
    const single = cell.enumDefault === 0;
    const editcontent = (
      <ClickAwayable
        onClickAwayExceptions={['.cellUsers', '.selectUserBox', '#dialogBoxSelectUser']}
        onClickAway={() => this.handleExitEditing()}
      >
        <div
          className={cx('cellUsers cellControl cellControlUserPopup cellControlEdittingStatus', {
            cellControlErrorStatus: error,
          })}
          ref={isediting && !single ? this.cell : () => {}}
          style={{
            width: style.width,
            ...(single ? { minHeight: 'auto', height: style.height - 1 } : { minHeight: rowHeight }),
          }}
        >
          {value.map((user, index) => this.renderCellUser(user, index))}
          {!single && (
            <span className="addUserBtn" onClick={this.pickUser}>
              <i className="icon icon-add Gray_75 Font14"></i>
            </span>
          )}
        </div>
        {error && single && <CellErrorTip pos={rowIndex === 0 ? 'bottom' : 'top'} error={error} />}
      </ClickAwayable>
    );

    if (disabled) {
      return (
        <div>
          {!!value && (
            <div className={cx('cellUsers cellControl', { singleLine })}>
              {value.map((user, index) => this.renderCellUser(user, index))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Trigger
        action={['click']}
        popup={editcontent}
        getPopupContainer={popupContainer}
        popupClassName="filterTrigger"
        popupVisible={isediting}
        popupAlign={{
          points: ['tl', 'tl'],
          overflow: {
            adjustX: true,
            adjustY: true,
          },
        }}
      >
        <EditableCellCon
          conRef={single ? this.cell : () => {}}
          hideOutline={!single}
          clickAwayWrap={single}
          onClickAwayExceptions={['.cellUsers', '.selectUserBox', '#dialogBoxSelectUser']}
          onClickAway={() => isediting && this.handleExitEditing()}
          onClick={this.props.onClick}
          className={cx(className, { canedit: editable })}
          style={style}
          iconName="people_5"
          isediting={isediting}
          onIconClick={cell.enumDefault === 0 ? this.handleSingleEdit : this.handleMutipleEdit}
        >
          {!!value && (
            <div className={cx('cellUsers cellControl', { singleLine })}>
              {value.map((user, index) => this.renderCellUser(user, index))}
            </div>
          )}
        </EditableCellCon>
      </Trigger>
    );
  }
}
