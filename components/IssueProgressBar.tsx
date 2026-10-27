'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Circle, Clock, Settings, XCircle, Lock } from 'lucide-react';

interface IssueProgressBarProps {
  status: string;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusSteps = [
  { key: 'submitted', label: 'Submitted', icon: Circle, color: 'blue' },
  { key: 'under_review', label: 'Under Review', icon: Clock, color: 'yellow' },
  { key: 'in_progress', label: 'In Progress', icon: Settings, color: 'purple' },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle, color: 'green' },
];

const getStatusProgress = (status: string) => {
  const index = statusSteps.findIndex(step => step.key === status);
  if (status === 'rejected') return { percent: 0, step: -1, isRejected: true };
  if (status === 'closed') return { percent: 100, step: statusSteps.length, isClosed: true };
  return { percent: ((index + 1) / statusSteps.length) * 100, step: index, isRejected: false, isClosed: false };
};

export default function IssueProgressBar({ status, showLabels = true, size = 'md' }: IssueProgressBarProps) {
  const progress = getStatusProgress(status);
  
  const sizeClasses = {
    sm: { bar: 'h-1.5', icon: 'w-4 h-4', text: 'text-xs', dot: 'w-6 h-6' },
    md: { bar: 'h-2', icon: 'w-5 h-5', text: 'text-sm', dot: 'w-8 h-8' },
    lg: { bar: 'h-3', icon: 'w-6 h-6', text: 'text-base', dot: 'w-10 h-10' },
  };

  const currentSize = sizeClasses[size];

  // Compact mode for table rows and cards
  if (!showLabels) {
    if (progress.isRejected) {
      return (
        <div className="w-full space-y-1" role="progressbar" aria-valuenow={0} aria-valuemin={0} aria-valuemax={100}>
          <div className="flex items-center justify-between text-[11px] font-bold text-rose-600">
            <span className="text-[10px] font-medium uppercase tracking-wider">Rejected</span>
            <span>0% Done</span>
          </div>
          <div className={`w-full bg-rose-500/20 rounded-full overflow-hidden ${currentSize.bar}`}>
            <div className={`${currentSize.bar} bg-rose-500 rounded-full w-full opacity-60`} />
          </div>
        </div>
      );
    }

    const pct = Math.round(progress.percent);
    const stepLabel = progress.isClosed ? 'Closed' : statusSteps[progress.step]?.label || status.replace('_', ' ');

    return (
      <div className="w-full space-y-1" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">
            {stepLabel}
          </span>
          <span className={`text-[11px] font-bold ml-1 shrink-0 ${pct === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'}`}>
            {pct}% Done
          </span>
        </div>
        <div className={`w-full bg-secondary/80 dark:bg-gray-700/80 rounded-full overflow-hidden ${currentSize.bar}`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className={`${currentSize.bar} rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500`}
          />
        </div>
      </div>
    );
  }

  // Full detailed mode with step dots
  if (progress.isRejected) {
    return (
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between text-red-500">
          <div className="flex items-center gap-2">
            <XCircle className={currentSize.icon} />
            <span className={`font-semibold ${currentSize.text}`}>Issue Rejected</span>
          </div>
          <span className={`${currentSize.text} font-bold`}>0% Done</span>
        </div>
        <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${currentSize.bar}`}>
          <div className={`${currentSize.bar} bg-red-500 rounded-full w-full`} />
        </div>
      </div>
    );
  }

  if (progress.isClosed) {
    return (
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between text-gray-500">
          <div className="flex items-center gap-2">
            <Lock className={currentSize.icon} />
            <span className={`font-semibold ${currentSize.text}`}>Issue Closed</span>
          </div>
          <span className={`${currentSize.text} font-bold text-gray-700 dark:text-gray-300`}>100% Done</span>
        </div>
        <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${currentSize.bar}`}>
          <div className={`${currentSize.bar} bg-gray-500 rounded-full w-full`} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
      {/* Progress Bar */}
      <div className="relative">
        <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${currentSize.bar}`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress.percent}%` }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className={`${currentSize.bar} rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500`}
          />
        </div>
      </div>

      {/* Status Steps */}
      <div className="flex justify-between items-start">
        {statusSteps.map((step, index) => {
          const isCompleted = index <= progress.step;
          const isCurrent = index === progress.step;
          const Icon = step.icon;
          
          const colorClasses = {
            blue: 'bg-blue-500 text-white border-blue-500',
            yellow: 'bg-yellow-500 text-white border-yellow-500',
            purple: 'bg-purple-500 text-white border-purple-500',
            green: 'bg-green-500 text-white border-green-500',
          };

          return (
            <div key={step.key} className="flex flex-col items-center gap-2 flex-1">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className={`
                  ${currentSize.dot} rounded-full flex items-center justify-center border-2
                  ${isCompleted 
                    ? colorClasses[step.color as keyof typeof colorClasses]
                    : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400'
                  }
                  ${isCurrent ? 'ring-4 ring-offset-2 ring-offset-white dark:ring-offset-gray-900' : ''}
                  ${isCurrent && step.color === 'blue' ? 'ring-blue-300' : ''}
                  ${isCurrent && step.color === 'yellow' ? 'ring-yellow-300' : ''}
                  ${isCurrent && step.color === 'purple' ? 'ring-purple-300' : ''}
                  ${isCurrent && step.color === 'green' ? 'ring-green-300' : ''}
                  transition-all duration-300
                `}
              >
                <Icon className={currentSize.icon} />
              </motion.div>
              <span className={`
                ${currentSize.text} font-medium text-center max-w-[80px]
                ${isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}
                ${isCurrent ? 'font-bold' : ''}
              `}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress Percentage */}
      <div className="text-center">
        <span className={`${currentSize.text} font-bold text-gray-900 dark:text-white`}>
          {Math.round(progress.percent)}% Done
        </span>
      </div>
    </div>
  );
}
