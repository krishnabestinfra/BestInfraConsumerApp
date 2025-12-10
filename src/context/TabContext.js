// TabContext.js
import React, { createContext, useState } from "react";

export const TabContext = createContext();

export const TabProvider = ({ children }) => {
  const [activeItem, setActiveItem] = useState("PostPaidDashboard");

  return (
    <TabContext.Provider value={{ activeItem, setActiveItem }}>
      {children}
    </TabContext.Provider>
  );
};