import WorkflowCanvas from './components/workflow/WorkflowCanvas.jsx';

export default function App() {
  return (
    <div className="appShell">
      <header className="appHeader">
        <h1 className="appTitle">Workflow Builder UI</h1>
        <p className="appSubtitle">Tree-based workflow editor</p>
      </header>

      <main className="appMain">
        <WorkflowCanvas />
      </main>
    </div>
  );
}
