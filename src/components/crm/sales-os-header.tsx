import {
  Bell,
  Search,
} from "lucide-react";

type HeaderProps = {
  title: string;
  description: string;
};

export function Header({
  title,
  description,
}: HeaderProps) {
  return (
    <header className="top-header">
      <div>
        <h1>{title}</h1>

        <p>{description}</p>
      </div>

      <div className="header-actions">
        <label className="search-field">
          <Search size={18} />

          <input
            aria-label="Pesquisar"
            placeholder="Pesquisar no sistema..."
            type="search"
          />
        </label>

        <button
          aria-label="Notificações"
          className="icon-button"
          type="button"
        >
          <Bell size={19} />

          <span className="notification-dot" />
        </button>
      </div>
    </header>
  );
}