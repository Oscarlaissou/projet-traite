import React from "react"
import "./Header.css"
import { Search, ChevronDown } from "lucide-react"
import NotificationsMenu from "./NotificationsMenu"
import NotificationsBanner from "./NotificationsBanner"

const Header = () => {
  return (
    <header className="header">
      <NotificationsBanner />
      <div className="header-left">
        <h1 className="page-title">Dashboard</h1>
      </div>
      <div className="header-center">
        <div className="search-container">
          <input type="text" placeholder="Search..." className="search-input" />
          <button className="search-button">
            <Search size={16} />
          </button>
        </div>
      </div>
      <div className="header-right">
        <NotificationsMenu />
        <div className="user-profile">
          <div className="user-avatar">
            <img src="/logo512.png" alt="User Avatar" />
          </div>
          <span className="user-name">Aiden Max</span>
          <ChevronDown className="dropdown-arrow" size={12} />
        </div>
      </div>
    </header>
  )
}

export default Header
