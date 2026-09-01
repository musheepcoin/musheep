import { generateCommentReply, CommentReplyError } from '../lib/comment-reply.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    return res.status(200).json(await generateCommentReply(req.body));
  } catch (error) {
    return res.status(error instanceof CommentReplyError ? error.status : 500).json({
      error: error instanceof CommentReplyError ? error.message : 'Impossible de générer la réponse.'
    });
  }
}
