import { memo } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const markdownComponents = {
  p: ({ children }) => <p className="ai-chat__md-p">{children}</p>,
  h1: ({ children }) => <p className="ai-chat__md-heading">{children}</p>,
  h2: ({ children }) => <p className="ai-chat__md-heading">{children}</p>,
  h3: ({ children }) => <p className="ai-chat__md-heading">{children}</p>,
  code: ({ children }) => <code className="ai-chat__md-code-inline">{children}</code>,
  pre: ({ children }) => <pre className="ai-chat__md-pre">{children}</pre>,
  ul: ({ children }) => <ul className="ai-chat__md-list">{children}</ul>,
  ol: ({ children }) => <ol className="ai-chat__md-list">{children}</ol>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow">{children}</a>
  ),
  img: ({ alt }) => (alt ? <span>{alt}</span> : null),
  table: ({ children }) => (
    <div className="ai-chat__md-table-wrapper">
      <table className="ai-chat__md-table">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => <th className="ai-chat__md-th">{children}</th>,
  td: ({ children }) => <td className="ai-chat__md-td">{children}</td>,
};

// Assistant markdown, memoised so re-renders during a stream do not reparse finished messages.
const ChatMarkdown = memo(
  ({ content }) => (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  ),
  (prev, next) => prev.content === next.content,
);

ChatMarkdown.displayName = 'ChatMarkdown';

ChatMarkdown.propTypes = {
  content: PropTypes.string.isRequired,
};

export default ChatMarkdown;
