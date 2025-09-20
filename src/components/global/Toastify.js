import React from "react";
import Toast from 'react-native-toast-message';

const showToast = (type, title, message = '') => {
    Toast.show({
        type: type,      // 'success', 'error', 'info', 'warning'
        text1: title,    
        text2: message,  
        position: 'top',  
        visibilityTime: 4000,  
        autoHide: true,
        topOffset: 50,
    });
};


export const showSuccess = (title, message = '') => {
  showToast('success', title, message);
};

export const showError = (title, message = '') => {
  showToast('error', title, message);
};

export const showInfo = (title, message = '') => {
  showToast('info', title, message);
};

// export const showWarning = (title, message = '') => {
//   showToast('warning', title, message);
// };

