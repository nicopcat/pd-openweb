export const downloadFile = ({ url, params, exportFileName } = {}) => {
  window
    .mdyAPI('', '', params, {
      ajaxOptions: {
        url,
        responseType: 'blob',
      },
      customParseResponse: true,
    })
    .then(blob => {
      if (blob.type.includes('application/json')) {
        const reader = new FileReader();
        reader.readAsText(blob, 'utf-8');
        reader.onload = function () {
          const { exception } = JSON.parse(reader.result);
          alert(exception, 2);
        };
      } else {
        const fileName = exportFileName;
        const link = document.createElement('a');

        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(link.href);
      }
    });
};
