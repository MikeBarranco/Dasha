export type CommunityEvent = {
  id: string;
  title: string;
  type: string;
  date: string;
  place: string;
  image: string;
  description: string;
  interested: number;
  // Organización que publica el evento (para filtrar los del propio aliado en su
  // portal). Ausente en los datos de ejemplo.
  organizationId?: string;
};

export type ForumReply = {
  id: string;
  author: string;
  role: string;
  timeAgo: string;
  text: string;
};

export type ForumPost = {
  id: string;
  author: string;
  role: string;
  timeAgo: string;
  text: string;
  image?: string;
  likes: number;
  comments: number;
  // Respuestas embebidas si el backend las incluye en GET /forum/posts.
  replies?: ForumReply[];
  // El backend marca si el usuario en sesión ya reportó esta publicación.
  hasReported?: boolean;
  // El backend marca si el usuario en sesión ya le dio like (para que el corazón
  // siga encendido tras refrescar).
  likedByMe?: boolean;
};
