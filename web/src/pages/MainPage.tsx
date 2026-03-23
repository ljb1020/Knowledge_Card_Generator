import { observer } from 'mobx-react-lite';
import LeftPanel from '../components/LeftPanel';
import CenterPanel from '../components/CenterPanel';
import RightPanel from '../components/RightPanel';

export default observer(function MainPage() {
  return (
    <div className="flex h-screen bg-background">
      <LeftPanel />
      <CenterPanel />
      <RightPanel />
    </div>
  );
});
