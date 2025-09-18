import React, { useState } from 'react';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Button from './Button';
import { showSuccess, showError, showInfo, showWarning } from './ToastHelper';

const DownloadButton = ({ 
  data = [], 
  columns = [], 
  fileName = 'data', 
  title = 'Download',
  variant = 'primary',
  size = 'medium',
  style = {},
  textStyle = {},
  disabled = false,
  showFormatOptions = true
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  // Generate Excel/CSV content
  const generateCSVContent = () => {
    if (!data || data.length === 0) {
      return '';
    }

    // Use provided columns or extract from first data item
    const headers = columns.length > 0 
      ? columns.map(col => col.title || col.key)
      : Object.keys(data[0] || {});

    // CSV Rows
    const rows = data.map((item, index) => {
      if (columns.length > 0) {
        return columns.map(col => item[col.key] || 'N/A');
      }
      return Object.values(item);
    });

    // Add serial number if not present
    const finalHeaders = headers.includes('S.No') ? headers : ['S.No', ...headers];
    const finalRows = headers.includes('S.No') 
      ? rows 
      : rows.map((row, index) => [index + 1, ...row]);

    // Combine headers and rows
    const csvContent = [finalHeaders, ...finalRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  };

  // Generate PDF content (HTML format for better mobile compatibility)
  const generatePDFContent = () => {
    if (!data || data.length === 0) {
      return '';
    }

    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();

    // Use provided columns or extract from first data item
    const headers = columns.length > 0 
      ? columns.map(col => col.title || col.key)
      : Object.keys(data[0] || {});

    // Add serial number if not present
    const finalHeaders = headers.includes('S.No') ? headers : ['S.No', ...headers];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Data Report</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #55B56C;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #55B56C;
            margin: 0;
            font-size: 24px;
          }
          .header p {
            margin: 5px 0;
            color: #666;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            font-size: 14px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
            word-wrap: break-word;
          }
          th {
            background-color: #55B56C;
            color: white;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .status-success {
            color: #28a745;
            font-weight: bold;
          }
          .status-failed {
            color: #dc3545;
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body { margin: 0; }
            .header { page-break-after: avoid; }
            table { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Data Report</h1>
          <p>Generated on: ${currentDate} at ${currentTime}</p>
          <p>Total Records: ${data.length}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              ${finalHeaders.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map((item, index) => {
              const values = columns.length > 0 
                ? columns.map(col => item[col.key] || 'N/A')
                : Object.values(item);
              
              const finalValues = headers.includes('S.No') 
                ? values 
                : [index + 1, ...values];

              return `
                <tr>
                  ${finalValues.map(value => {
                    const stringValue = String(value || 'N/A');
                    const cellClass = stringValue === 'Success' ? 'status-success' : 
                                     stringValue === 'Failed' ? 'status-failed' : '';
                    return `<td class="${cellClass}">${stringValue}</td>`;
                  }).join('')}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>BestInfra App - Data Report</p>
        </div>
      </body>
      </html>
    `;

    return htmlContent;
  };

  // Download as Excel/CSV
  const downloadAsExcel = async () => {
    try {
      setIsDownloading(true);
      showInfo('Preparing Excel file...');

      const csvContent = generateCSVContent();
      if (!csvContent) {
        showError('No data available to download');
        return;
      }

      const fileExtension = 'csv';
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `${fileName}_${timestamp}.${fileExtension}`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Share Data File',
        });
        showSuccess('Excel file downloaded successfully!');
      } else {
        showError('Sharing not available on this device');
      }
    } catch (error) {
      console.error('Error downloading Excel file:', error);
      showError('Failed to download Excel file');
    } finally {
      setIsDownloading(false);
    }
  };

  // Download as PDF (HTML format)
  const downloadAsPDF = async () => {
    try {
      setIsDownloading(true);
      showInfo('Preparing PDF file...');

      const htmlContent = generatePDFContent();
      if (!htmlContent) {
        showError('No data available to download');
        return;
      }

      const fileExtension = 'html';
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `${fileName}_${timestamp}.${fileExtension}`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/html',
          dialogTitle: 'Share Data Report',
        });
        showSuccess('PDF report downloaded successfully!');
      } else {
        showError('Sharing not available on this device');
      }
    } catch (error) {
      console.error('Error downloading PDF file:', error);
      showError('Failed to download PDF file');
    } finally {
      setIsDownloading(false);
    }
  };

  // Show download options
  const handleDownload = () => {
    if (!data || data.length === 0) {
      showWarning('No data available to download');
      return;
    }

    if (showFormatOptions) {
      Alert.alert(
        'Download Options',
        'Choose the format for your data:',
        [
          {
            text: 'Excel (CSV)',
            onPress: downloadAsExcel,
          },
          {
            text: 'PDF (HTML)',
            onPress: downloadAsPDF,
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
    } else {
      // Default to Excel if no format options
      downloadAsExcel();
    }
  };

  return (
    <Button 
      title={isDownloading ? "Downloading..." : title}
      variant={variant}
      size={size}
      style={style}
      textStyle={textStyle}
      onPress={handleDownload}
      disabled={disabled || isDownloading || !data || data.length === 0}
    />
  );
};

export default DownloadButton;
