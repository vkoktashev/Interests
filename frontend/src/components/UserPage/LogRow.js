import React, { useEffect} from "react";
import {
    useHistory
  } from "react-router-dom";
import './style.css';
import Rating from "react-rating";
import {
    MDBIcon
} from "mdbreact";

function LogRow ( {log} ) {
    let history = useHistory();

    useEffect(() =>{
            
        },
        [log]
    );

    function translateActionType(action){
        switch (action) {
            case 'score':
                return 'оценил(а)';
            case 'status':
                return 'изменил(а) статус';
            case 'review':
                return 'оставил(а) отзыв на';
            case 'spent_time':
                return 'изменил(а) время прохождения';
            default:
                return action;
        }
    }

    function translateType(type, actionType){
        switch (type) {
            case 'game':
                if (actionType === 'score' || actionType === 'review')
                    return 'игру';
                else
                    return 'игры';
            case 'movie':
                if (actionType === 'score' || actionType === 'review')
                    return 'фильм';
                else
                    return 'фильма';
            default:
                return type;
        }
    }

    function nameToLink(name, type, id){
        switch (type){
            case 'game':
                return  <a href={window.location.origin + '/game/' + id} 
                            className="logLink"
                            onClick={(e) => { history.push('/game/' + id); e.preventDefault();}}>
                                {name}
                        </a>;
            case 'movie':
                return  <a href={window.location.origin + '/movie/' + id} 
                            className="logLink"
                            onClick={(e) => { history.push('/movie/' + id); e.preventDefault();}}>
                                {name}
                        </a>;
            default:
                return name;
        }
    }

    function actionResultToStr(actionType, actionResult){
        switch (actionType){
            case 'score':
                return  <Rating stop={10}
                            emptySymbol={<MDBIcon far icon="star" size="1x"/>}
                            fullSymbol={[1,2,3,4,5,6,7,8,9,10].map(n => <MDBIcon icon="star" size="1x" title={n}/>)}
                            initialRating={actionResult}
                            readonly={true}
                        />
            case 'status':
                return '"' + actionResult + '"';
            case 'review':
                return '"' + actionResult + '"';
            case 'spent_time':
                return actionResult + ' ' + intToHours(actionResult);
            default:
                return actionResult;
        }
    }

    function parseDate(date){
        let newDate = new Date(date);
        return newDate.toLocaleTimeString("ru-RU");
    }

    return(
            <p className="logRow">{parseDate(log.created)} {translateActionType(log.action_type)} {translateType(log.type, log.action_type)} {nameToLink(log.target, log.type, log.target_id)}: {actionResultToStr(log.action_type, log.action_result)}</p>
    )
}

function intToHours(number){
    if (11 <= number && number <= 14)
        return 'часов'
    else if (number % 10 === 1)
        return 'час'
    else if (2 <= number % 10 && number % 10 <= 4)
        return 'часа'
    else
        return 'часов'
}

export default LogRow;