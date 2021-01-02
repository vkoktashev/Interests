import React, { useEffect, useState} from "react";

import {
    MDBDataTable
} from "mdbreact";

function ShowBlock ( {shows, stats} ) {

    const showColumns = [
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
      }
    ];

  const [showTableData, setShowTableData] = useState({
      columns: showColumns,
      rows: [
      ]
  });

    useEffect(() =>{
            if (shows)
            {
              setShowTableData({
                columns: showColumns,
                rows: shows.map((show) => {
                    return {
                            name: <a className="dataTable" href={window.location.origin + '/show/' + show.show.tmdb_id}>{show.show.tmdb_name}</a>,
                            name2: show.show.tmdb_name,
                            status: show.status,
                            score: show.score,
                            review: show.review,
                            /*clickEvent: (e) => {
                                //window.open('/game/' + game.game.rawg_slug);
                                history.push('/movie/' + movie.movie.tmdb_id)
                            }*/
                        }      
                  })
              });
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [shows]
    );

    return(
        <div>
            <p>Серий сериалов посмотрено: {stats.episodes.count}, часов просмотра: {stats.episodes.total_spent_time}</p>  
            <MDBDataTable
                striped
                bordered
                small
                data={showTableData}
                info={false}
                barReverse={true}
                noBottomColumns={true}
                noRecordsFoundLabel="Ничего не найдено!"
                paginationLabel={["Предыдущая", "Следующая"]}
                entriesLabel="Показывать сериалов на странице"
                searchLabel='Поиск'
                />
        </div>  
    )
}

export default ShowBlock;
