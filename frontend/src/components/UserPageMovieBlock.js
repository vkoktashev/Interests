import React, { useEffect, useState} from "react";
import {
    useHistory
  } from "react-router-dom";

import {
    MDBDataTable
} from "mdbreact";

function UserPageMovieBlock ( {movies, stats} ) {
    let history = useHistory();

    const movieColumns = [
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
      }
    ];

  const [movieTableData, setMovieTableData] = useState({
      columns: movieColumns,
      rows: [
      ]
  });

    useEffect(() =>{
            if (movies)
            {
              setMovieTableData({
                columns: movieColumns,
                rows: movies.map((movie) => {
                    return {
                            name: movie.movie.tmdb_name,
                            status: movie.status,
                            score: movie.score,
                            review: movie.review,
                            clickEvent: (e) => {
                                //window.open('/game/' + game.game.rawg_slug);
                                history.push('/movie/' + movie.movie.tmdb_id)
                            }
                        }      
                  })
              });
            }
        },
        [movies]
    );

    return(
        <div>
            <hr style={{ color: '#6C0AAB', backgroundColor: '#4527a0', height: 2.5,  borderColor : '#6C0AAB' }}/>
            <p>Фильмов посмотрено: {stats.movies_count}, часов просмотра: {stats.movies_total_spent_time}</p>  
            <MDBDataTable
                striped
                bordered
                small
                data={movieTableData}
                info={false}
                barReverse={true}
                noBottomColumns={true}
                noRecordsFoundLabel="Ничего не найдено!"
                paginationLabel={["Предыдущая", "Следующая"]}
                entriesLabel="Показывать фильмов на странице"
                searchLabel='Поиск'
                />
        </div>  
    )
}

export default UserPageMovieBlock;
