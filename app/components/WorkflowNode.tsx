
import React from 'react';

interface WorkflowNodeProps {
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

const WorkflowNode: React.FC<WorkflowNodeProps> = ({ title, description, isActive, onClick, icon }) => {
  return (
    <div 
      onClick={onClick}
      className={`relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
        isActive 
        ? 'border-indigo-500 bg-indigo-50 shadow-md ring-4 ring-indigo-100' 
        : 'border-slate-200 bg-white'
      }`}
    >
      <div className={`p-3 rounded-lg mr-4 ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
        {icon}
      </div>
      <div>
        <h3 className={`font-semibold text-lg ${isActive ? 'text-indigo-900' : 'text-slate-800'}`}>{title}</h3>
        <p className="text-sm text-slate-500 line-clamp-2">{description}</p>
      </div>
      {isActive && (
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-indigo-500 rounded-full animate-pulse shadow-sm"></div>
      )}
    </div>
  );
};

export default WorkflowNode;
