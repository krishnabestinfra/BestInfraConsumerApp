// TabContext.js
import React, { createContext, useState } from "react";

export const TabContext = createContext();

export const TabProvider = ({ children }) => {
  const [activeItem, setActiveItem] = useState("Dashboard");

  return (
    <TabContext.Provider value={{ activeItem, setActiveItem }}>
      {children}
    </TabContext.Provider>
  );
};