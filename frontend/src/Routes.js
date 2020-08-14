import React from "react";
import { Route, Switch } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import HomePage from "./components/HomePage";
import GamePage from "./components/GamePage";

class Routes extends React.Component {
  render() {
    return (
      <div>
        <Switch>
          <Route exact path="/" component={HomePage} />
          <Route exact path="/game/:id" component={GamePage} />
          <Route render={function () { return <h1>Not Found</h1>; }} />
      </Switch>
      <ToastContainer position="top-center" hideProgressBar newestOnTop closeOnClick/>
      </div>
    );
  }
}

export default Routes;