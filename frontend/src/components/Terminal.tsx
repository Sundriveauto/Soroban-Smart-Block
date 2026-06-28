import React from "react";

interface TerminalProps {
  output: string[];
}

const Terminal: React.FC<TerminalProps> = ({ output }) => {
  const terminalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="terminal">
      <div className="terminal-header">Terminal</div>
      <div className="terminal-content" ref={terminalRef}>
        {output.map((line, i) => (
          <div key={i} className="terminal-line">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Terminal;
