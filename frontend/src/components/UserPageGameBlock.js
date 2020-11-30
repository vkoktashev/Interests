import React, { useEffect, useState} from "react";
import {
    useHistory
  } from "react-router-dom";

import {
    MDBDataTable
} from "mdbreact";

function UserPageGameBlock ( {games, stats} ) {
    let history = useHistory();

    const gameColumns = [
        {
          label: 'Название',
          field: 'name',
          sort: 'asc'
        },
        {
          label: 'Статус',
          field: 'status',
          sort: 'asc'
        },
        {
          label: 'Оценка',
          field: 'score',
          sort: 'asc'
        },
        {
          label: 'Отзыв',
          field: 'review',
          sort: 'asc'
        },
        {
          label: 'Время прохождения',
          field: 'spent_time',
          sort: 'asc'
        }
      ];

    const [gameTableData, setGameTableData] = useState({
        columns: gameColumns,
        rows: [
        ]
    });

    useEffect(() =>{
            if (games)
            {
                setGameTableData({
                    columns: gameColumns,
                    rows: games.map((game) => {
                        return {
                                name: game.game.rawg_name,
                                status: game.status,
                                score: game.score,
                                review: game.review,
                                spent_time: game.spent_time,
                                clickEvent: (e) => {
                                    //window.open('/game/' + game.game.rawg_slug);
                                    history.push('/game/' + game.game.rawg_slug)
                                }
                            }      
                    })
                });
            }
        },
        [games]
    );

    return(
        <div>
            <hr style={{ color: '#6C0AAB', backgroundColor: '#4527a0', height: 2.5,  borderColor : '#6C0AAB' }}/>
            <p>Игр сыграно: {stats.games_count}, часов наиграно: {stats.games_total_spent_time}</p>  
            <MDBDataTable
                striped
                bordered
                small
                data={gameTableData}
                info={false}
                barReverse={true}
                noBottomColumns={true}
                noRecordsFoundLabel="Ничего не найдено!"
                paginationLabel={["Предыдущая", "Следующая"]}
                entriesLabel="Показывать игр на странице"
                searchLabel='Поиск'
                />
        </div>  
    )
}

export default UserPageGameBlock;
