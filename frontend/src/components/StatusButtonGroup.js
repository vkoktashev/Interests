import React, {useState, useEffect} from "react";


function StatusButtonGroup( {statuses, activeColor, onChangeStatus, userStatus} ) {
    const [activeStatus, setActiveStatus] = useState('');

    useEffect(() =>{

            setActiveStatus(userStatus?userStatus:statuses[0]);
        },
        [statuses, userStatus]
    );

    return(
        <div>
            {statuses.map((status) => <button className={'contentStatuses'} 
                                            key={status}
                                            style={{backgroundColor: (activeStatus === status?activeColor:'#1d0d0d')}}
                                            onClick={()=>{ 
                                                if (onChangeStatus(status)){
                                                    setActiveStatus(status);
                                                }
                                            }}>
                                            {status}
                                        </button>) }
        </div>  
    )
}

export default StatusButtonGroup;
