import React, { useEffect, useState} from "react";

import {
    MDBDataTable
} from "mdbreact";

function MovieBlock ( {movies, stats} ) {

    const movieColumns = [
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
                            name: <a className="logRow" href={window.location.origin + '/movie/' + movie.movie.tmdb_id}>{movie.movie.tmdb_name}</a>,
                            name2: movie.movie.tmdb_name,
                            status: movie.status,
                            score: movie.score,
                            review: movie.review,
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
        [movies]
    );

    return(
        <div>
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

export default MovieBlock;
