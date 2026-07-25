import { Link } from "react-router-dom";

import styles from "./Brand.module.css";

export function Brand() {
  return (
    <Link className={styles.brand} to="/" aria-label="lucaszzx-dev — início">
      <span className={styles.prompt} aria-hidden="true">&gt;_</span>
      <span>lucaszzx-dev</span>
    </Link>
  );
}
