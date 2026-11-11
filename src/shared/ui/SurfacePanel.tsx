/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { cn } from '@/shared/lib/utils';
import styles from './SurfacePanel.module.css';

export type SurfacePanelVariant = 'default' | 'glass' | 'matte';

export interface SurfacePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'md' | 'lg';
  variant?: SurfacePanelVariant;
}

const SurfacePanel: React.FC<SurfacePanelProps> = ({
  padding = 'md',
  variant = 'default',
  className,
  children,
  ...rest
}) => (
  <div
    className={cn(
      styles.root,
      variant !== 'default' ? styles[variant] : null,
      padding === 'lg' ? styles.paddingLg : styles.paddingMd,
      className
    )}
    {...rest}
  >
    {children}
  </div>
);

export default SurfacePanel;
