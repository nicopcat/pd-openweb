import PropTypes from 'prop-types';
import React, { Component, Fragment } from 'react';
import { Textarea, Linkify } from 'ming-ui';
import cx from 'classnames';
import TextScanQRCode from '../../components/TextScanQRCode';
import { getIsScanQR } from '../../components/ScanQRCode';

export default class Widgets extends Component {
  static propTypes = {
    hint: PropTypes.string,
    disabled: PropTypes.bool,
    value: PropTypes.string,
    enumDefault: PropTypes.number,
    strDefault: PropTypes.string,
    onChange: PropTypes.func,
    onBlur: PropTypes.func,
  };

  state = {
    isEditing: false,
    originValue: '',
  };

  onFocus = e => {
    this.setState({ originValue: e.target.value.trim() });
  };

  onChange = value => {
    this.props.onChange(value);
  };

  onBlur = () => {
    const { onBlur } = this.props;
    const { originValue } = this.state;

    this.setState({ isEditing: false });
    if (navigator.userAgent.toLowerCase().indexOf('micromessenger') >= 0) {
      // 处理微信webview键盘收起 网页未撑开
      window.scrollTo(0, 0);
    }
    onBlur(originValue);
  };

  /**
   * 多行文本进入编辑
   */
  joinTextareaEdit = evt => {
    const { disabled, advancedSetting } = this.props;
    const href = evt.target.getAttribute('href');

    // 复制中的时候不进入编辑
    if (window.getSelection().toString()) return;

    if (href) {
      const a = document.createElement('a');
      a.href = href;
      a.target = '_blank';
      a.rel = 'nofollow noopener noreferrer';
      a.click();
      evt.preventDefault();
    } else if (!disabled && advancedSetting.dismanual !== '1') {
      this.setState({ isEditing: true }, () => {
        this.text && this.text.focus();
      });
    }
  };

  render() {
    const { disabled, value = '', enumDefault, strDefault = '10', advancedSetting, projectId } = this.props;
    let { hint } = this.props;
    const { isEditing } = this.state;
    const disabledInput = advancedSetting.dismanual === '1';
    const isUnLink = advancedSetting.analysislink !== '1';
    const isSingleLine = enumDefault === 2;
    const isScanQR = getIsScanQR();
    const startTextScanCode = !disabled && isScanQR && strDefault.split('')[1] === '1';

    // 开启扫码输入并且禁止手动输入
    if (startTextScanCode && disabledInput) {
      hint = _l('请扫码输入');
    } else if (disabledInput) {
      hint = _l('请在移动端扫码输入');
    }

    return (
      <Fragment>
        {!isEditing ? (
          <div
            className={cx(
              'customFormControlBox customFormTextareaBox',
              { Gray_bd: !value },
              { controlDisabled: disabled },
              { textAreaDisabledControl: enumDefault === 1 && disabled },
            )}
            style={{
              minHeight: enumDefault === 1 ? 90 : 36,
              width: startTextScanCode ? 'calc(100% - 42px)' : '100%',
              lineHeight: 1.5,
            }}
            onClick={this.joinTextareaEdit}
          >
            {value ? isUnLink ? value : <Linkify properties={{ target: '_blank' }}>{value}</Linkify> : hint}
            {!disabled && !disabledInput && (
              <input type="text" className="smallInput" onFocus={() => this.setState({ isEditing: true })} />
            )}
          </div>
        ) : isSingleLine ? (
          <input
            type="text"
            className="customFormControlBox escclose"
            style={{ width: startTextScanCode ? 'calc(100% - 42px)' : '100%', paddingTop: 2 }}
            ref={text => {
              this.text = text;
            }}
            placeholder={hint}
            onFocus={this.onFocus}
            value={(value || '').replace(/\r\n|\n/g, ' ')}
            onChange={event => this.onChange(event.target.value)}
            onBlur={event => {
              const trimValue = event.target.value.trim();
              if (trimValue !== value) {
                this.onChange(trimValue);
              }
              this.onBlur();
            }}
          />
        ) : (
          <Textarea
            isFocus
            className="customFormTextarea escclose"
            style={{ width: startTextScanCode ? 'calc(100% - 42px)' : '100%' }}
            minHeight={enumDefault === 1 ? 90 : 36}
            maxHeight={400}
            value={value}
            placeholder={hint}
            spellCheck={false}
            onFocus={this.onFocus}
            onChange={this.onChange}
            onBlur={this.onBlur}
          />
        )}

        {startTextScanCode && <TextScanQRCode projectId={projectId} onChange={this.onChange} />}
      </Fragment>
    );
  }
}
