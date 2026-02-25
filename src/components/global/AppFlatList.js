/**
 * Shared virtual list primitive: FlatList with consistent defaults for performance.
 * Use for list screens (Invoices, Notifications, etc.) for less duplication and consistent behavior.
 */
import React from 'react';
import { FlatList } from 'react-native';
import { listDefaults } from '../../constants/designTokens';

const AppFlatList = React.forwardRef((props, ref) => {
  const {
    initialNumToRender = listDefaults.initialNumToRender,
    maxToRenderPerBatch = listDefaults.maxToRenderPerBatch,
    windowSize = listDefaults.windowSize,
    removeClippedSubviews = true,
    ...rest
  } = props;

  return (
    <FlatList
      ref={ref}
      initialNumToRender={initialNumToRender}
      maxToRenderPerBatch={maxToRenderPerBatch}
      windowSize={windowSize}
      removeClippedSubviews={removeClippedSubviews}
      {...rest}
    />
  );
});

AppFlatList.displayName = 'AppFlatList';

export default AppFlatList;
