import React from 'react';
import { MSGTYPES } from '../../constants';
import { applicationIcon } from 'src/util';
import cx from 'classnames';
import UserCard from 'src/components/UserCard';

const formatUser = function (props) {
  const { accountId, fullname, avatar, inboxType, appId } = props;
  // 系统消息 应用类型
  let applicationType = '';

  switch (inboxType) {
    case MSGTYPES.SystemMessage:
      applicationType = 'system';
      break;
    case MSGTYPES.CalendarMessage:
      applicationType = 'calendar';
      break;
    case MSGTYPES.TaskMessage:
    case MSGTYPES.FolderMessage:
      applicationType = 'task';
      break;
    case MSGTYPES.KCMessage:
      applicationType = 'knowledge';
      break;
    case MSGTYPES.ApprovalMessage:
      applicationType = 'approval';
      break;
    case MSGTYPES.AttendanceMessage:
      applicationType = 'check';
      break;
    case MSGTYPES.DossierMessage:
      applicationType = 'dossier';
      break;
    case MSGTYPES.WorkSheetMessage:
      applicationType = 'worksheet';
      break;
    case MSGTYPES.WorkFlowMessage:
      applicationType = 'workflow';
      break;
    default:
      break;
  }
  return {
    accountId,
    fullname,
    avatar,
    applicationType,
    appId,
  };
};

let date = null;

export default class Avatar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ...formatUser(props),
    };
  }


  render() {
    const { accountId, fullname, avatar, applicationType, appId } = this.state;

    if (applicationType) {
      return (
        <span
          className={cx('ThemeColor2 msgIcon', { calendar: applicationType === 'calendar ' })}
          data-date={date || (date = new Date().getDate())}
          dangerouslySetInnerHTML={{ __html: applicationIcon(applicationType, 'small') }}
        />
      );
    } else {
      let param = {};
      if (!(md.global.Account.isPortal || (accountId || '').indexOf('a#') > -1)) {
        param = {
          href: '/user_' + accountId,
        };
      }
      return (
        <UserCard sourceId={accountId} appId={appId}>
          <a
            {...param}
            target="_blank"
            className="inboxAvatar"
            ref={elem => {
              this.card = elem;
            }}
          >
            <img src={avatar} title={fullname} />
          </a>
        </UserCard>
      );
    }
  }
}
