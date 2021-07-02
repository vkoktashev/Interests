import React from "react";
import { MDBIcon } from "mdbreact";
import "./item-row.sass";

function ItemRow({ data, fields }) {
	return (
		<div className='item-row'>
			<div className='item-row__review' style={{ display: data.review ? "block" : "none" }}>
				Отзыв
				<div className='item-row__review-body'>{data.review}</div>
			</div>
			<div className='item-row__body'>
				<div className='item-row__body-left'>
					<div className='item-row__poster' style={{ backgroundImage: `url(${data.poster})` }} />
					<div className='item-row__name'>
						<a href={data.link}> {data.name} </a>
					</div>
				</div>

				<div className='item-row__body-right'>
					<div className='item-row__status-block'>
						статус
						<div className='item-row__status'>{data.status}</div>
					</div>
					<div className='item-row__score'>
						<div>{data.score}/10</div>
						<MDBIcon icon='star' className='item-row__score-icon' />
					</div>
					{fields.find((field) => field.key === "spent_time") === undefined ? (
						""
					) : (
						<div className='item-row__time'>
							<div>{data.spent_time}</div>
							<MDBIcon icon='clock' className='item-row__time-icon' />
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default ItemRow;
