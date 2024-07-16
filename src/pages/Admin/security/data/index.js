import React, { Component } from 'react';
import { Support } from 'ming-ui';
import FeatureListWrap from '../../components/FeatureListWrap';
import Config from '../../config';
import { VersionProductType } from 'src/util/enum';
import EncryptRules from './encryptRules';
import WebProxySetting from './WebProxySetting';
import LimitFileDownloadSetting from './LimitFileDownloadSetting';
import projectSettingController from 'src/api/projectSetting';
import dataLimitAjax from 'src/api/dataLimit';
import AdminTitle from 'src/pages/Admin/common/AdminTitle';

export default class DataCom extends Component {
  constructor(props) {
    super(props);
    this.state = {
      watermark: false,
      showWebProxySetting: false,
      showLimitDownload: false,
    };
  }

  componentDidMount() {
    this.getEnabledWatermark();
    this.getApiProxyState();
    this.getAttachmentSetting();
    if (location.pathname.includes('isShowEncryptRules')) {
      this.setEncryptRules();
    }
  }

  getEnabledWatermark = () => {
    projectSettingController.getEnabledWatermark({ projectId: Config.projectId }).then(res => {
      this.setState({ watermark: res.enabledWatermark });
    });
  };

  getApiProxyState = () => {
    projectSettingController.getApiProxyState({ projectId: Config.projectId }).then(res => {
      this.setState({ webProxy: res });
    });
  };

  getAttachmentSetting = () => {
    dataLimitAjax.getAttachmentSetting({ projectId: Config.projectId }).then(res => {
      this.setState({ limitFileDownload: res.status, limitType: res.limitType, whiteList: res.whiteList });
    });
  };

  setEnabledWatermark = () => {
    const { watermark } = this.state;

    projectSettingController
      .setEnabledWatermark({ projectId: Config.projectId, enabledWatermark: !watermark })
      .then(res => {
        if (res) {
          this.setState({ watermark: !watermark });
          setTimeout(() => {
            location.reload();
          }, 500);
        }
      });
  };

  updateWebProxyState = () => {
    const { webProxy } = this.state;
    projectSettingController
      .setApiProxyState({
        projectId: Config.projectId,
        state: !webProxy,
      })
      .then(res => {
        if (!res) {
          alert(_l('操作失败'), 2);
        } else {
          this.setState({ webProxy: !webProxy });
        }
      });
  };

  setLimitDownloadStatus = () => {
    const { limitFileDownload, limitType } = this.state;
    dataLimitAjax
      .editAttachmentSetting({
        projectId: Config.projectId,
        status: limitFileDownload ? 0 : 1,
        limitType,
      })
      .then(res => {
        if (res) {
          this.setState({
            limitFileDownload: !limitFileDownload,
          });
        }
      });
  };

  updateSettingData = (limitType, whiteList) => {
    this.setState({ limitType, whiteList });
  };

  render() {
    const {
      showEncryptRules,
      watermark,
      showWebProxySetting,
      webProxy,
      limitFileDownload,
      showLimitDownload,
      limitType,
      whiteList,
    } = this.state;
    const projectId = Config.projectId;

    if (showEncryptRules) {
      return <EncryptRules onClose={() => this.setState({ showEncryptRules: false })} projectId={projectId} />;
    }

    if (showWebProxySetting) {
      return <WebProxySetting onClose={() => this.setState({ showWebProxySetting: false })} projectId={projectId} />;
    }
    if (showLimitDownload) {
      return (
        <LimitFileDownloadSetting
          projectId={projectId}
          limitType={limitType}
          whiteList={whiteList}
          onClose={() => this.setState({ showLimitDownload: false })}
          updateSettingData={this.updateSettingData}
        />
      );
    }

    return (
      <div className="orgManagementWrap">
        <AdminTitle prefix={_l('安全 - 数据')} />
        <div className="orgManagementHeader Font17">{_l('数据')}</div>
        <FeatureListWrap
          projectId={projectId}
          configs={[
            {
              key: 'watermark',
              title: _l('屏幕水印'),
              description: _l('启用水印配置后，将在组织所有应用内显示当前使用者的姓名'),
              showSlideIcon: false,
              showSwitch: true,
              switchChecked: watermark,
              clickSwitch: this.setEnabledWatermark,
            },
            {
              key: 'limitFileDownload',
              title: _l('附件下载'),
              description: _l('禁止成员下载应用、讨论附件，保护组织文件安全'),
              showSlideIcon: false,
              showSwitch: true,
              showSetting: limitFileDownload ? true : false,
              switchChecked: limitFileDownload ? true : false,
              customContent: !limitFileDownload
                ? undefined
                : limitType === 0
                ? _l('已设置：禁止所有设备下载')
                : _l('已设置：禁止所有Web移动端下载'),
              clickSwitch: this.setLimitDownloadStatus,
              clickSetting: () => this.setState({ showLimitDownload: true }),
            },
            {
              key: 'addressVisibleRange',
              title: _l('加密规则'),
              description: _l('配置工作表字段加密存储时可以选择的加密方式'),
              showSlideIcon: true,
              featureId: VersionProductType.dataEnctypt,
              onClick: () => this.setState({ showEncryptRules: true }),
            },
            {
              key: 'webProxy',
              title: _l('API网络代理'),
              description: (
                <span>
                  {_l('在发送API请求时可选择通过设置的代理服务器发送')}
                  <Support text={_l('帮助')} type={3} href="https://help.mingdao.com/org/security#apiproxy" />
                </span>
              ),
              showSlideIcon: false,
              showSetting: webProxy,
              showSwitch: true,
              switchChecked: webProxy,
              featureId: VersionProductType.apiRequestProxy,
              clickSwitch: this.updateWebProxyState,
              clickSetting: () => this.setState({ showWebProxySetting: true }),
            },
          ]}
        />
      </div>
    );
  }
}
