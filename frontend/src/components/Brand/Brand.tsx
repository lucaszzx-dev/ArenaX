import { Link } from "react-router-dom";

import styles from "./Brand.module.css";

export function Brand() {
  return (
    <Link className={styles.brand} to="/" aria-label="ArenaX — início">
      <span className={styles.symbol} aria-hidden="true">
        AX
      </span>
      <span>ArenaX</span>
    </Link>
  );
}
