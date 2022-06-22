import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { arrayOf, func, number, string } from 'prop-types';
import UserHead from 'src/pages/feed/components/userHead';
import { getTabTypeBySelectUser } from 'src/pages/worksheet/common/WorkSheetFilter/util';
import 'dialogSelectUser';

const Con = styled.div`
  display: flex;
  align-items: center;
  min-height: 32px;
  line-height: 32px;
  border: 1px solid #dddddd;
  border-radius: 4px;
  border: 1px solid ${({ active }) => (active ? '#2196f3' : '#ddd')} !important;
  .clearIcon {
    display: none;
  }
  &:hover {
    .clearIcon {
      display: inline-block;
    }
  }
  ${({ isEmpty }) => (!isEmpty ? '&:hover { .downIcon { display: none;} }' : '')}
`;

const UsersCon = styled.div`
  cursor: pointer;
  flex: 1;
  overflow: hidden;
  font-size: 13px;
  min-height: 32px;
  padding: 0 0 0 10px;
`;

const UserItem = styled.div`
  font-size: 13px;
  display: inline-block;
  color: #333;
  background: #e5e5e5;
  height: 24px;
  line-height: 24px;
  border-radius: 24px;
  padding-right: 8px;
  margin: 4px 6px 0 0;
  .userHead {
    display: inline-block !important;
    margin-right: 6px;
    vertical-align: top;
    img {
      vertical-align: unset;
    }
  }
`;

const Icon = styled.i`
  cursor: pointer;
  font-size: 13px;
  color: #9e9e9e;
  margin-right: 8px;
`;

const Empty = styled.span`
  color: #bdbdbd;
`;
export default function Users(props) {
  const { values = [], projectId, isMultiple, onChange = () => {}, appId } = props;
  const [active, setActive] = useState();
  const conRef = useRef();
  const tabType = getTabTypeBySelectUser(props.control);
  return (
    <Con
      isEmpty={!values.length}
      active={active}
      onClick={() => {
        setActive(true);
        $(conRef.current).quickSelectUser({
          showQuickInvite: false,
          showMoreInvite: false,
          isTask: false,
          tabType,
          appId,
          includeUndefinedAndMySelf: true,
          includeSystemField: true,
          offset: {
            top: 0,
            left: 1,
          },
          zIndex: 10001,
          filterAccountIds: [md.global.Account.accountId],
          SelectUserSettings: {
            projectId,
            unique: !isMultiple,
            callback(users) {
              onChange({ values: isMultiple ? _.uniqBy([...values, ...users], 'accountId') : users });
              setActive(false);
            },
          },
          selectCb(users) {
            onChange({ values: isMultiple ? _.uniqBy([...values, ...users], 'accountId') : users });
            setActive(false);
          },
          onClose: () => {
            setActive(false);
          },
        });
      }}
    >
      <UsersCon ref={conRef}>
        {!values.length && <Empty>{_l('请选择')}</Empty>}
        {values.map(user => (
          <UserItem className="ellipsis">
            <UserHead
              className="userHead"
              alwaysBindCard
              user={{
                userHead: user.avatar,
                accountId: user.accountId,
              }}
              size={24}
            />
            {user.fullname}
            <i
              className="icon icon-delete Gray_9e Font10 mLeft6 Hand"
              onClick={e => {
                e.stopPropagation();
                onChange({ values: values.filter(v => v.accountId !== user.accountId) });
              }}
            />
          </UserItem>
        ))}
      </UsersCon>
      <Icon className="icon icon-arrow-down-border downIcon" />
      {!!values.length && (
        <Icon
          className="icon icon-cancel clearIcon"
          onClick={() => {
            onChange({ values: [] });
          }}
        />
      )}
    </Con>
  );
}

Users.propTypes = {
  projectId: string,
  values: arrayOf(string),
  onChange: func,
};
