CREATE TABLE public.processed_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.processed_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can insert processed messages" ON public.processed_messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Service can select processed messages" ON public.processed_messages FOR SELECT TO anon USING (true);

CREATE INDEX idx_processed_messages_message_id ON public.processed_messages(message_id);