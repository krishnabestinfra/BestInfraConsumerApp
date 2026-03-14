// TabContext.js
import React, { createContext, useState, useMemo } from "react";

export const TabContext = createContext();

export const TabProvider = ({ children }) => {
  const [activeItem, setActiveItem] = useState("Dashboard");
  const value = useMemo(() => ({ activeItem, setActiveItem }), [activeItem]);

  return (
    <TabContext.Provider value={value}>
      {children}
    </TabContext.Provider>
  );
};