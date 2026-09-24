'use client';

import React from 'react';
import { FaArrowLeft } from 'react-icons/fa';

interface HeaderBarProps {
  onBack: () => void;
  title?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onBack, title = 'Pet Information' }) => (
  <div className="form-header-bar">
    <button className="back-circle-btn" onClick={onBack}>
      <FaArrowLeft />
    </button>
    <h1 className="form-main-title">{title}</h1>
  </div>
);