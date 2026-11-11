/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { cn } from '@/shared/lib/utils';
import styles from './Alert.module.css';

export type AlertVariant = 'danger' | 'info';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  variant?: AlertVariant;
}

const Alert: React.FC<AlertProps> = ({
  title,
  variant = 'danger',
  className,
  children,
  ...rest
}) => (
  <div
    role="alert"
    className={cn(styles.root, styles[variant], className)}
    {...rest}
  >
    <p className={styles.title}>
      <span className={styles.indicator} aria-hidden />
      {title}
    </p>
    {children ? <div className={styles.body}>{children}</div> : null}
  </div>
);

export default Alert;
