import React from "react";
import { MDBIcon } from "mdbreact";

function ItemRow({ data, fields }) {
	return (
		<div className='itemBlock'>
			<div className='itemReview' style={{ display: data.review ? "block" : "none" }}>
				Отзыв
				<div className='itemReviewUser'>{data.review}</div>
			</div>
			<div className='itemRow'>
				<div className='itemRowLeft'>
					<div className='itemPoster' style={{ backgroundImage: `url(${data.poster})` }} />
					<div className='itemName'>
						<a href={data.link}> {data.name} </a>
					</div>
				</div>

				<div className='itemRowRight'>
					<div className='itemStatus'>
						статус
						<div className='itemStatusUser'>{data.status}</div>
					</div>
					<div className='itemScore'>
						<div>{data.score}/10</div>
						<MDBIcon icon='star' />
					</div>
					{!fields.includes("spent_time") ? (
						""
					) : (
						<div className='itemTime'>
							<div>{data.spent_time}</div>
							<MDBIcon icon='clock' />
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default ItemRow;
