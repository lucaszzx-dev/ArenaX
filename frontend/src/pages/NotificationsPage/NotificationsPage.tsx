import { useState } from "react";
import { Link } from "react-router-dom";

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications
} from "../../features/notifications/notification-query";
import styles from "./NotificationsPage.module.css";

const PAGE_LIMIT = 20;

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const notificationsQuery = useNotifications(page, PAGE_LIMIT);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  if (notificationsQuery.isPending) {
    return <div className={styles.state} role="status">Carregando notificações...</div>;
  }

  if (notificationsQuery.isError) {
    return <div className={styles.state} role="alert">Não foi possível carregar suas notificações.</div>;
  }

  const { notifications, total, unread } = notificationsQuery.data;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  function openNotification(notificationId: string) {
    markRead.mutate(notificationId);
  }

  function changePage(next: number) {
    setPage(next);
    window.scrollTo({ top: 0 });
  }

  return (
    <section className={styles.page}>
      <Link className={styles.back} to="/painel">← Voltar ao painel</Link>
      <header className={styles.heading}>
        <span>Central de notificações</span>
        <h1>Notificações</h1>
        <p>Resultados, mudanças de horário, convocações e avanços do mata-mata.</p>
        <div className={styles.actions}>
          <button
            disabled={markAllRead.isPending || unread === 0}
            onClick={() => markAllRead.mutate()}
            type="button"
          >
            Marcar todas como lidas
          </button>
          <span>{unread > 0 ? unreadLabel(unread) : "Tudo lido"}</span>
        </div>
      </header>

      {notifications.length === 0 && (
        <div className={styles.empty}>
          <strong>Nenhuma notificação por aqui.</strong>
          <p>Você será avisado quando houver novidades nas suas arenas.</p>
        </div>
      )}

      <ul className={styles.list}>
        {notifications.map((notification) => (
          <li className={notification.readAt ? styles.read : styles.unread} key={notification.id}>
            <Link
              className={styles.item}
              onClick={() => openNotification(notification.id)}
              to={notification.link}
            >
              <div className={styles.itemHeader}>
                <strong>{notification.title}</strong>
                <time dateTime={notification.createdAt}>
                  {formatRelativeTime(notification.createdAt)}
                </time>
              </div>
              <p>{notification.message}</p>
            </Link>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <nav className={styles.pagination} aria-label="Paginação de notificações">
          <button disabled={page <= 1} onClick={() => changePage(page - 1)} type="button">
            Anteriores
          </button>
          <span>Página {page} de {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => changePage(page + 1)} type="button">
            Próximas
          </button>
        </nav>
      )}
    </section>
  );
}

function unreadLabel(unread: number) {
  return unread === 1 ? "1 não lida" : unread + " não lidas";
}

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return "há " + minutes + " min";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return "há " + hours + "h";
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "há 1 dia" : "há " + days + " dias";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}
