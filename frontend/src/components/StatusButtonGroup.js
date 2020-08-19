import React, {useState, useEffect} from "react";


function StatusButtonGroup( {statuses, activeColor, onChangeStatus} ) {
    const [activeStatus, setActiveStatus] = useState('');

    useEffect(() =>{
            setActiveStatus(statuses[0]);
        },
        [statuses]
    );

    return(
        <div>
            {statuses.map((status) => <button className={'contentStatuses'} 
                                            key={status}
                                            style={{backgroundColor: (activeStatus === status?activeColor:'#1d0d0d')}}
                                            onClick={()=>{ 
                                                setActiveStatus(status);
                                                onChangeStatus(status);
                                            }}>
                                            {status}
                                        </button>) }
        </div>  
    )
}

export default StatusButtonGroup;
