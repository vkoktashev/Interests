import React from "react";
import './style.css';

function StatusButtonGroup( {statuses, activeColor, onChangeStatus, userStatus} ) {

    return(
        <div>
            {statuses.map((status) => <button className={'contentStatuses'} 
                                            key={status}
                                            style={{backgroundColor: (userStatus === status?activeColor:'#000000')}}
                                            onClick={()=>{  onChangeStatus(status); }}>
                                            {status}
                                        </button>) }
        </div>  
    )
}

export default StatusButtonGroup;
