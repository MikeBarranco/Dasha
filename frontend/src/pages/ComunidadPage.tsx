import { useState } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, MapPin, Heart, MessageCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { cn } from '../lib/cn';
import { communityEvents, forumPosts } from '../data/mockComunidad';

type Tab = 'eventos' | 'foro';

function EventsList() {
  return (
    <div className="space-y-4">
      {communityEvents.map((event, index) => (
        <motion.article
          key={event.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
          className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
        >
          <div className="relative">
            <img src={event.image} alt={event.title} className="h-40 w-full object-cover" />
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-cobalto">
              {event.type}
            </span>
          </div>
          <div className="p-4">
            <h3 className="font-display text-lg font-bold text-cobalto">{event.title}</h3>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" /> {event.date}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {event.place}
              </span>
            </div>
            <p className="mt-2 text-sm text-neutral-600">{event.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-neutral-400">{event.interested} interesados</span>
              <button
                type="button"
                className="rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Me interesa
              </button>
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  );
}

function ForumList() {
  return (
    <div className="space-y-4">
      {forumPosts.map((post, index) => (
        <motion.article
          key={post.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
          className="rounded-2xl border border-neutral-200 bg-white p-4"
        >
          <div className="flex items-center gap-3">
            <Avatar name={post.author} className="h-10 w-10 text-sm" />
            <div>
              <p className="text-sm font-semibold text-neutral-700">{post.author}</p>
              <p className="text-xs text-neutral-400">
                {post.role} · {post.timeAgo}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-neutral-600">{post.text}</p>
          {post.image && (
            <img src={post.image} alt="" className="mt-3 h-48 w-full rounded-xl object-cover" />
          )}
          <div className="mt-3 flex items-center gap-5 text-sm text-neutral-500">
            <span className="flex items-center gap-1.5">
              <Heart className="h-4 w-4" /> {post.likes}
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" /> {post.comments}
            </span>
          </div>
        </motion.article>
      ))}
    </div>
  );
}

export function ComunidadPage() {
  const [tab, setTab] = useState<Tab>('eventos');

  return (
    <div>
      <PageHeader
        title="Comunidad"
        subtitle="Eventos de esterilización, vacunación y adopción, y un foro para ayudarnos entre todos."
      />

      <div className="mb-5 inline-flex rounded-xl bg-neutral-100 p-1">
        {(['eventos', 'foro'] as Tab[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTab(option)}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
              tab === option ? 'bg-white text-cobalto shadow-sm' : 'text-neutral-500',
            )}
          >
            {option === 'eventos' ? 'Eventos' : 'Foro'}
          </button>
        ))}
      </div>

      {tab === 'eventos' ? <EventsList /> : <ForumList />}
    </div>
  );
}
