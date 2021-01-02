import React, { useEffect, useState} from "react";

import {
    MDBDataTable
} from "mdbreact";

function GameBlock ( {games, stats} ) {

    const gameColumns = [
        {
          label: 'Название',
          field: 'name',
          sort: 'disabled'
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
                                name: <a className="dataTable" href={window.location.origin + '/game/' + game.game.rawg_slug}>{game.game.rawg_name}</a>,
                                name2: game.game.rawg_name,
                                status: game.status,
                                score: game.score,
                                review: game.review,
                                spent_time: parseFloat(game.spent_time),
                                /*clickEvent: (e) => {
                                    //window.open('/game/' + game.game.rawg_slug);
                                    history.push('/game/' + game.game.rawg_slug);
                                }*/
                            }      
                    })
                });
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [games]
    );

    return(
        <div>
            <p>Игр сыграно: {stats.games?stats.games.count:0}, часов наиграно: {stats.games?stats.games.total_spent_time:0}</p>  
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
                className='dataTable'
                />
        </div>  
    )
}

export default GameBlock;
