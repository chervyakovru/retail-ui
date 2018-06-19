import * as React from 'react';
import styles = require('./Modal.less');

export class Body extends React.Component {
  public render(): JSX.Element {
    return <div className={styles.body}>{this.props.children}</div>;
  }
}
