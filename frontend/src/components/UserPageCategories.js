import React, {useState, useEffect} from "react";


function UserPageCategories( {categories, activeColor, onChangeCategory} ) {
    const [activeCategory, setActiveCategory] = useState(categories[0]);

    return(
        <div>
            {categories.map((category) => <button className={'userPageCategoriesTab'} 
                                            key={category}
                                            style={{color: (activeCategory === category?activeColor:'#000000')}}
                                            onClick={()=>{ 
                                                setActiveCategory(category);
                                                onChangeCategory(category);
                                            }}>
                                            {category}
                                        </button>) }
        </div>  
    )
}

export default UserPageCategories;
