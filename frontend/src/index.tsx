/// <reference types="@steroidsjs/core/index" />

import * as React from 'react';
import {createRoot} from 'react-dom/client';
import Application from './Application';

const root = createRoot(document.getElementById('root'));
root.render(<Application />);
