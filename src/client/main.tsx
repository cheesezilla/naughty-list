import { render } from 'preact';
import '@fontsource/lilita-one/400.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/800.css';
import { App } from './app.js';
import './styles.css';

render(<App />, document.getElementById('app')!);
